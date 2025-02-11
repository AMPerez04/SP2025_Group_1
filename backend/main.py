from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from typing import Optional
import os
import time
from analytics.data_fetcher import fetch_stock_data
import logging
from analytics.arima_model import train_arima_model, predict_arima_model
import pandas as pd


logging.basicConfig(
    level=logging.INFO,
    filename="backend.log",
    filemode="a",
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]

if client:
    logger.info("MongoDB connection successful")
else:
    logger.error("MongoDB connection failed")


@app.get("/")
def read_root():
    return {"message": "Welcome to the Stock Dashboard API!"}


# ================================================================================================================================
# === /search endpoints =========================================================================================================
# ================================================================================================================================
assets = db["assets"]
cache = {}
CACHE_EXPIRATION_TIME = 86400  # 1 day = 86400 seconds


@app.get("/search")
async def get_assets(query: str = Query(None, min_length=1)):
    """returns basic info for assets that match the search bar query"""
    global cache

    current_time = time.time()
    if (
        query in cache
        and (current_time - cache[query]["timestamp"]) < CACHE_EXPIRATION_TIME
    ):
        return cache[query]["data"]

    query = query.lower()

    prefix_query = {
        "$or": [
            {"Ticker": {"$regex": f"^{query}", "$options": "i"}},
            {"Name": {"$regex": f"^{query}", "$options": "i"}},
            {"Exchange": {"$regex": f"^{query}", "$options": "i"}},
            {"Country": {"$regex": f"^{query}", "$options": "i"}},
        ]
    }

    assets_cursor = assets.find(
        prefix_query,
        {
            "_id": 0,
            "Ticker": 1,
            "IconURL": 1,
            "Name": 1,
            "Country": 1,
            "Exchange": 1,
            "CountryFlag": 1,
        },
    ).sort([("Ticker", 1), ("Name", 1)])

    assets_list = [
        {
            "ticker": asset.get("Ticker", ""),
            "icon": asset.get("IconURL", ""),
            "full_name": asset.get("Name", ""),
            "market": asset.get("Exchange", ""),
            "country": asset.get("Country", ""),
            "country_flag": asset.get("CountryFlag", ""),
        }
        for asset in assets_cursor
    ]

    cache[query] = {"data": assets_list, "timestamp": current_time}

    return assets_list


# ================================================================================================================================
# === /watchlist endpoints ======================================================================================================
# ================================================================================================================================
watchlists = db["watchlists"]


class WatchlistTicker(BaseModel):
    """each ticker in watchlist has a ticker, full name, and image src URL"""

    Ticker: str
    FullName: str
    Icon: str


class WatchlistRequest(BaseModel):
    """watchlist request takes in a ID, Ticker to add/remove, and the full name + icon src URL"""

    ID: str
    Ticker: str
    FullName: Optional[str] = None
    Icon: Optional[str] = None


class WatchlistResponse(BaseModel):
    """watchlist response outputs list of tickers (watchlist) associated with the ID"""

    ID: str
    Tickers: list[WatchlistTicker]


@app.get("/watchlist/{ID}", response_model=WatchlistResponse)
def get_watchlist(ID: str):
    """returns watchlist associated with UserID"""
    mongo_id = ObjectId(ID)
    watchlist = watchlists.find_one({"_id": mongo_id})
    if watchlist:
        return {"ID": ID, "Tickers": watchlist["Tickers"]}
    return {"ID": ID, "Tickers": []}


@app.post("/watchlist/add", response_model=WatchlistResponse)
async def add_to_watchlist(request: WatchlistRequest):
    """adds requested ticker to user's watchlist"""

    mongo_id = ObjectId(request.ID)
    watchlist = watchlists.find_one({"_id": mongo_id})
    ticker_details = {
        "Ticker": request.Ticker,
        "FullName": request.FullName,
        "Icon": request.Icon,
    }
    # 3 cases:
    # 1. User has watchlist, and requested ticker is new  --> add to watchlist
    # 2. User has watchlist, but requested ticker is duplicate --> don't add it again
    # 3. User has no watchlist (for some reason) --> create new watchlist with requested ticker
    if watchlist:
        if not any(
            ticker["Ticker"] == request.Ticker for ticker in watchlist["Tickers"]
        ):
            watchlists.update_one(
                {"_id": mongo_id},
                {"$push": {"Tickers": ticker_details}},
            )
    else:
        watchlists.insert_one({"_id": mongo_id, "Tickers": [ticker_details]})

    return get_watchlist(request.ID)


@app.post("/watchlist/remove")
async def remove_from_watchlist(request: WatchlistRequest):
    """removes requested ticker from user's watchlist"""
    try:
        mongo_id = ObjectId(request.ID)
        ticker = request.Ticker

        watchlist_collection = watchlists.find_one({"_id": mongo_id})

        ticker_exists = any(
            item["Ticker"] == ticker for item in watchlist_collection.get("Tickers", [])
        )
        if ticker_exists:
            watchlists.update_one(
                {"_id": mongo_id},
                {"$pull": {"Tickers": {"Ticker": ticker}}},
            )

        return {"success": True}

    except Exception:
        return {"success": False}


@app.get("/data")
def fetch_financial_data(ticker: str, period: str = "1y", interval: str = "1d"):
    """
    returns stock data for ticker

    ticker: str\n
    period: str = "1y"\n
    interval: str = "1d"\n

    returns: dict
    """

    logger.info(
        f"Fetching data for ticker(s) {ticker} with period {period} and interval {interval}"
    )
    try:
        stock_data = fetch_stock_data(
            ticker=ticker, period=period, interval=interval, is_prediction=False
        )
        return stock_data
    except Exception as e:
        logger.error(f"Error fetching data for ticker(s) {ticker}: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# ================================================================================================================================
# === /predict endpoints ========================================================================================================
# ================================================================================================================================


class ARIMATrainResponse(BaseModel, arbitrary_types_allowed=True):
    model: any
    stock_data: dict


@app.post("/predict_arima")
def predict_arima(ticker: str, period: str, interval: str) -> dict:
    """Predict future stock prices using the trained ARIMA model"""
    try:
        stock_data = fetch_stock_data(
            ticker=ticker, period=period, interval=interval, is_prediction=True
        )

        df = pd.DataFrame(
            index=pd.to_datetime(list(stock_data[ticker]["Close"].keys()))
        )
        df["Close"] = list(stock_data[ticker]["Close"].values())

        model = train_arima_model(df, period, interval)
        forecast, steps = predict_arima_model(model, period, interval)

        last_date = df.index[-1]
        dates = pd.date_range(start=last_date, periods=len(forecast) + 1)[1:]
        forecast_dict = {
            str(date): float(value)
            for date, value in zip(dates, forecast)
            if pd.notna(value)
        }

        return forecast_dict

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in predict_arima: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


# @app.post("/predict_arima")
# def predict_arima(
#     ticker: str,
#     period: str,
#     interval: str,
# ) -> dict:
#     """Predict future stock prices using the trained ARIMA model\n
#     request: ARIMARequest\n
#     returns: dict
#     """

#     try:
#         # if interval not in period_interval_map[period]:
#         #     logger.info(f"Invalid interval '{interval}' for period '{period}'. Valid intervals for this period are: {', '.join(period_interval_map[period])}. Changing to default interval '{period_interval_map[period][0]}'")
#         #     interval = period_interval_map[period][0]
#         result = _train_arima(ticker, period, interval)
#         model = result.model
#         stock_data = result.stock_data
#         logger.info(f"Model trained for {ticker}")
#     except Exception as e:
#         logger.error(f"Error training model for {ticker}: {e}")

#         raise HTTPException(status_code=500, detail="Internal Server Error")

#     try:
#         forecast, steps = predict_arima_model(model, period, interval)
#         logger.info(f"Model predicted for {ticker}")
#     except Exception as e:
#         logger.error(f"Error predicting model for {ticker}: {e}")
#         raise HTTPException(status_code=500, detail="Internal Server Error")
#     last_date_of_stock_data = pd.to_datetime(
#         sorted(stock_data[ticker]["Close"].keys())[-1]
#     )
#     last_price_of_stock_data = stock_data[ticker]["Close"][str(last_date_of_stock_data)]
#     first_date_of_forecast = last_date_of_stock_data + pd.Timedelta(days=1)
#     forecast_dates = pd.date_range(
#         start=first_date_of_forecast, periods=steps, freq="D"
#     )
#     forecast_series = pd.Series(
#         [last_price_of_stock_data] + list(forecast),
#         index=[last_date_of_stock_data] + list(forecast_dates),
#     )
#     return forecast_series.to_dict()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from fastapi import Request
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from typing import Optional
from passlib.context import CryptContext
import os
import time
from analytics.data_fetcher import fetch_stock_data
import logging
from analytics.arima_model import (
    ForecastModelFactory, 
    MarketCalendar, 
    ModelConfig
)
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

# Adds session middleware to store session data in a cookie
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", "super-secret-key"),
    session_cookie="session",  # name of the cookie
    https_only=False,  # false for development; true in production with HTTPS
    max_age=86400,  # persist for one day (86400 seconds)
    same_site="lax",  # or "strict", depending on your needs
)
# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]

# Create a password hashing context (using bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


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
            "ExchangeLogo": 1,
        },
    ).sort([("Ticker", 1), ("Name", 1)])

    assets_list = [
        {
            "ticker": asset.get("Ticker", ""),
            "icon": asset.get("IconURL", ""),
            "full_name": asset.get("Name", ""),
            "market_name": asset.get("Exchange", ""),
            "country": asset.get("Country", ""),
            "country_flag": asset.get("CountryFlag", ""),
            "market_logo": asset.get("ExchangeLogo", ""),
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
    """watchlist request takes in a UserID, Ticker to add/remove, and the full name + icon src URL"""

    ID: str
    Ticker: str
    FullName: Optional[str] = None  # optional for remove requests
    Icon: Optional[str] = None  # optional for remove requests
    MarketName: Optional[str] = None  # optional for remove requests
    MarketLogo: Optional[str] = None  # optional for remove requests


class WatchlistResponse(BaseModel):
    """watchlist response outputs list of tickers (watchlist) associated with the UserID"""

    Tickers: list[WatchlistTicker]


@app.get("/watchlist/{ID}", response_model=WatchlistResponse)
def get_watchlist(ID: str):
    """returns watchlist associated with UserID"""

    mongo_id = ObjectId(ID)
    watchlist = watchlists.find_one({"_id": mongo_id})
    if watchlist:
        return {"Tickers": watchlist["Tickers"]}

    return {"Tickers": []}


@app.post("/watchlist/add", response_model=WatchlistResponse)
async def add_to_watchlist(request: WatchlistRequest):
    """adds requested ticker to user's watchlist"""

    mongo_id = ObjectId(request.ID)
    watchlist = watchlists.find_one({"_id": mongo_id})
    ticker_details = {
        "Ticker": request.Ticker,
        "FullName": request.FullName,
        "Icon": request.Icon,
        "MarketName": request.MarketName,
        "MarketLogo": request.MarketLogo,
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
        # check if ticker is in user's watchlist
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


# ==============================================================================================================
# Authentication Endpoints (Login & Signup)
# ==============================================================================================================

users = db["users"]  # db collection w/ user info


class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


@app.post("/signup")
async def signup(user: UserSignup):
    # Check if a user with the same email already exists.
    existing_user = users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )
    # Hash the password (in production, never store plain-text passwords)
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "email": user.email,
        "username": user.username,
        "password": hashed_password,
    }
    result = users.insert_one(new_user)
    return {"message": "User created successfully.", "user_id": str(result.inserted_id)}


@app.post("/login")
async def login(request: Request, user: UserLogin):
    # Find the user in the database
    existing_user = users.find_one({"email": user.email})
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )
    if not pwd_context.verify(user.password, existing_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials."
        )
    # Store user information in the session
    request.session.update(
        {
            "user": {
                "email": existing_user["email"],
                "username": existing_user["username"],
                "user_id": str(existing_user["_id"]),
            }
        }
    )
    return {
        "message": "Login successful.",
        "user": {
            "email": existing_user["email"],
            "username": existing_user["username"],
            "user_id": str(existing_user["_id"]),
        },
    }


@app.post("/logout")
async def logout(request: Request):
    # Clear the session
    request.session.clear()
    return {"message": "Logged out successfully."}


@app.get("/session")
async def get_session(request: Request):
    # If the user is logged in, the session will contain user data.
    user = request.session.get("user")
    if user:
        return {"user": user}
    else:
        return {"user": None}


# ================================================================================================================================
# === /survey endpoints =========================================================================================================
# ================================================================================================================================
@app.get("/survey/sectors", response_model=list[str])
def get_sectors():
    """returns list of all unique sectors in the assets collection"""

    sectors = assets.distinct("Sector")
    return sectors


class SurveySubmission(BaseModel):
    ID: str
    Sectors: list[str]


@app.post("/survey")
async def submit_survey(request: SurveySubmission):
    """handles survey submission by creating a watchlist for the user.
    if no sectors are selected, an empty watchlist is created.
    otherwise, 2 stocks from each selected sector are added to the watchlist"""

    mongo_id = ObjectId(request.ID)

    watchlists.update_one(
        {"_id": mongo_id}, {"$setOnInsert": {"Tickers": []}}, upsert=True
    )

    if not request.Sectors:
        return

    selected_assets = []
    for sector in request.Sectors:
        cursor = assets.find(
            {"Sector": sector},
            {
                "_id": 0,
                "Ticker": 1,
                "Name": 1,
                "IconURL": 1,
                "Exchange": 1,
                "ExchangeLogo": 1,
            },
        ).limit(2)

        sector_assets = [
            {
                "Ticker": asset["Ticker"],
                "FullName": asset["Name"],
                "Icon": asset["IconURL"],
                "MarketName": asset["Exchange"],
                "MarketLogo": asset["ExchangeLogo"],
            }
            for asset in cursor
        ]
        selected_assets.extend(sector_assets)

    if selected_assets:
        watchlists.update_one({"_id": mongo_id}, {"$set": {"Tickers": selected_assets}})

    return


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
        # Create forecaster components
        market_calendar = MarketCalendar()
        config = ModelConfig()
        
        # Get forecaster via factory
        forecaster = ForecastModelFactory.create_model(
            "arima", 
            market_calendar=market_calendar, 
            config=config
        )
        
        # Fetch stock data
        stock_data = fetch_stock_data(
            ticker=ticker, period=period, interval=interval, is_prediction=True
        )
        
        # Transform data to DataFrame
        df = pd.DataFrame(
            index=pd.to_datetime(list(stock_data[ticker]["Close"].keys()))
        )
        df["Close"] = list(stock_data[ticker]["Close"].values())
        df = df.dropna()
        
        if len(df) < 10:
            raise ValueError(f"Not enough data points for {ticker}: {len(df)}")
            
        # Train model
        logger.info(f"Training model for {ticker} with {period}/{interval}")
        success = forecaster.train(df, period, interval)
        
        if not success:
            raise ValueError("Failed to train model")
            
        # Generate forecast
        result = forecaster.forecast()
        
        # Note: The to_dict() method returns data with the "forecast" ticker
        # We need to replace it with the actual ticker
        forecast_data = result.to_dict()
        forecast_data[ticker] = forecast_data.pop("forecast")
        
        logger.info(f"Successfully generated forecast for {ticker}")
        return forecast_data
        
    except ValueError as e:
        logger.error(f"Validation error in predict_arima: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in predict_arima: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal Server Error")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

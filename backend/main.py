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
from email.message import EmailMessage
import secrets
import smtplib
import ssl
from analytics.data_fetcher import fetch_stock_data, get_market_status
import logging
from analytics.arima_model import ForecastModelFactory, MarketCalendar, ModelConfig
import pandas as pd
from options import options_router
from news import news_router
import yfinance as yf
from datetime import datetime, timezone
from fastapi.responses import JSONResponse
from snaptrade_client import SnapTrade
from bson.errors import InvalidId

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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

app.include_router(options_router)
app.include_router(news_router)
# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]

# Create a password hashing context (using bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error processing request: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error"},
    )


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
    MarketName: str
    MarketLogo: str


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


class SettingsUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    new_password: Optional[str] = None
    password: str


@app.post("/signup")
async def signup(user: UserSignup):
    # Convert the email to lowercase before checking and inserting
    email_lower = user.email.lower()

    # Check if a user with the same email already exists.
    existing_user = users.find_one({"email": email_lower})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )
    # Hash the password (in production, never store plain-text passwords)
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "email": email_lower,
        "username": user.username,
        "password": hashed_password,
    }
    result = users.insert_one(new_user)
    return {"message": "User created successfully.", "user_id": str(result.inserted_id)}


@app.post("/login")
async def login(request: Request, user: UserLogin):
    email_lower = user.email.lower()

    # Find the user in the database
    existing_user = users.find_one({"email": email_lower})
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
                "snaptrade_user_secret": existing_user.get("snaptrade_user_secret"),
            }
        }
    )
    return {
        "message": "Login successful.",
        "user": {
            "email": existing_user["email"],
            "username": existing_user["username"],
            "user_id": str(existing_user["_id"]),
            "snaptrade_user_secret": existing_user.get("snaptrade_user_secret"),
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


@app.post("/update-settings")
async def update_settings(request: Request, update: SettingsUpdateRequest):
    """
    Endpoint for updating the user's account settings.
    The user may update their username, email, and/or password.
    In all cases, the current password must be provided for confirmation.
    """
    # Ensure the user is authenticated.
    session_user = request.session.get("user")
    if not session_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated."
        )

    user_id = session_user["user_id"]
    user_doc = users.find_one({"_id": ObjectId(user_id)})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    # Verify the provided current password.
    if not pwd_context.verify(update.password, user_doc["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect current password.",
        )

    # Build the update fields.
    update_fields = {}
    if update.username and update.username != user_doc["username"]:
        update_fields["username"] = update.username
    if update.email and update.email != user_doc["email"]:
        # Optionally check if the new email is already in use.
        if users.find_one({"email": update.email}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use."
            )
        update_fields["email"] = update.email
    if update.new_password:
        # Hash the new password before updating.
        hashed_new_password = pwd_context.hash(update.new_password)
        update_fields["password"] = hashed_new_password

    if not update_fields:
        return {"message": "No changes made."}

    users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})

    # Update the session with new info (do not store password here).
    for field in ["username", "email"]:
        if field in update_fields:
            session_user[field] = update_fields[field]
    request.session["user"] = session_user

    return {"message": "Settings updated successfully.", "user": session_user}


# ================================================================================================================================
# === /survey endpoints =========================================================================================================
# ================================================================================================================================
@app.get("/survey/sectors", response_model=list[str])
def get_sectors():
    """returns list of all unique sectors in the assets collection"""
    return [sector for sector in assets.distinct("Sector") if sector and sector.strip()]


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


# ================================================================================================================================
# === asset data =================================================================================================================
# ================================================================================================================================


@app.get("/data")
def fetch_financial_data(ticker: str, period: str = "1y", interval: str = "1d"):
    """
    returns stock data for ticker

    ticker: str\n
    period: str = "1y"\n
    interval: str = "1d"\n

    returns: dict
    """
    try:
        stock_data = fetch_stock_data(
            ticker=ticker,
            period=period,
            interval=interval,
        )
        return stock_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


class QuoteRequest(BaseModel):
    ticker: str


@app.post("/quote")
def get_quote(request: QuoteRequest):
    """
    returns quote data for asset
    """
    try:
        stock = yf.Ticker(request.ticker)
        info = stock.info

        def format_date(epoch):
            return (
                datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%b %d, %Y")
                if isinstance(epoch, (int, float))
                else "--"
            )

        def format_large_nums(val):
            if not isinstance(val, (int, float)):
                return "--"

            abs_val = abs(val)
            if abs_val >= 1e12:
                return f"{val / 1e12:,.3f}T"
            elif abs_val >= 1e9:
                return f"{val / 1e9:,.3f}B"
            return f"{val:,.0f}"

        def safe_format(val, default="--"):
            try:
                return f"{float(val):,.2f}"
            except (ValueError, TypeError):
                return default

        quote = {
            "previousClose": safe_format(info.get("previousClose")),
            "open": safe_format(info.get("open")),
            "bid": (
                f"{safe_format(info.get('bid'))} x {100 * info.get('bidSize', '--')}"
                if info.get("bid") and info.get("bidSize")
                else "--"
            ),
            "ask": (
                f"{safe_format(info.get('ask'))} x {100 * info.get('askSize', '--')}"
                if info.get("ask") and info.get("askSize")
                else "--"
            ),
            "daysRange": f"{safe_format(info.get('dayLow'))} - {safe_format(info.get('dayHigh'))}",
            "week52Range": f"{safe_format(info.get('fiftyTwoWeekLow'))} - {safe_format(info.get('fiftyTwoWeekHigh'))}",
            "volume": format_large_nums(info.get("volume")),
            "averageVolume": format_large_nums(info.get("averageVolume")),
            "marketCap": format_large_nums(info.get("marketCap")),
            "beta": safe_format(info.get("beta")),
            "peRatio": safe_format(info.get("trailingPE")),
            "eps": safe_format(info.get("trailingEps")),
            "earningsDate": f"{format_date(info.get('earningsTimestampStart'))} - {format_date(info.get('earningsTimestampEnd'))}",
            "dividendYield": (
                f"{safe_format(info.get('dividendRate'))} ({safe_format(info.get('dividendYield'))}%)"
                if info.get("dividendRate") and info.get("dividendYield")
                else "--"
            ),
            "exDividendDate": format_date(info.get("exDividendDate")),
            "targetEst": safe_format(info.get("targetMeanPrice")),
        }

        return quote
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/about")
def get_about(request: QuoteRequest):
    """
    returns description for asset
    """
    try:
        stock = yf.Ticker(request.ticker)
        info = stock.info

        def format_date(epoch):
            return (
                datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%B %d")
                if isinstance(epoch, (int, float))
                else "--"
            )

        def format_large_nums(val):
            if not isinstance(val, (int, float)):
                return "--"

            abs_val = abs(val)
            if abs_val >= 1e12:
                return f"{val / 1e12:,.1f}T"
            elif abs_val >= 1e9:
                return f"{val / 1e9:,.1f}B"
            elif abs_val >= 1e6:
                return f"{val / 1e6:,.1f}M"
            return f"{val:,.0f}"

        description = {
            "name": info.get("displayName", info.get("longName", "--")),
            "description": info.get("longBusinessSummary", "--"),
            "website": info.get("website", "--"),
            "sector": info.get("sector", "--"),
            "industry": info.get("industry", "--"),
            "employees": format_large_nums(info.get("fullTimeEmployees")),
            "nextFiscalYearEnd": format_date(info.get("nextFiscalYearEnd", "--")),
            "location": f"{info.get('city')}, {info.get('state')}"
            if (info.get("city") and info.get("state"))
            else "--",
            "leadership": info.get("companyOfficers")[0]["name"]
            if info.get("companyOfficers")
            else "--",
        }

        return description
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/is_market_open")
def is_market_open():
    """
    Checks if the market is currently open via yfinance
    """
    return get_market_status()


# ================================================================================================================================
# === /predict endpoints ========================================================================================================
# ================================================================================================================================


class ARIMATrainResponse(BaseModel, arbitrary_types_allowed=True):
    model: object
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
            "arima", market_calendar=market_calendar, config=config
        )

        # Fetch stock data
        stock_data = fetch_stock_data(
            ticker=ticker,
            period=period,
            interval=interval,
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
        success = forecaster.train(df, period, interval)

        if not success:
            raise ValueError("Failed to train model")

        # Generate forecast
        result = forecaster.forecast()

        # Note: The to_dict() method returns data with the "forecast" ticker
        # We need to replace it with the actual ticker
        forecast_data = result.to_dict()
        forecast_data[ticker] = forecast_data.pop("forecast")

        return forecast_data

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error {e}")


# --------------------------
# Forgot Password Functionality
# --------------------------


# Define a Pydantic model for forgot password request
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


def send_reset_email(recipient_email: str, reset_link: str):
    """Send a password reset email using Google SMTP."""
    smtp_server = "smtp.gmail.com"
    port = 465  # For SSL
    sender_email = os.getenv("GMAIL_USER")  # Your Gmail address
    sender_password = os.getenv("GMAIL_PASSWORD")  # Your Gmail password or app password

    # Create the email content
    message = EmailMessage()
    message.set_content(
        f"Click the following link to reset your password:\n\n{reset_link}"
    )
    message["Subject"] = "Password Reset Request"
    message["From"] = sender_email
    message["To"] = recipient_email

    # Create a secure SSL context and send the email
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(smtp_server, port, context=context) as server:
        server.login(sender_email, sender_password)
        server.send_message(message)


@app.post("/forgot-password")
async def forgot_password(request_data: ForgotPasswordRequest):
    """Endpoint for requesting a password reset email."""
    email_lower = request_data.email.lower()
    user = db["users"].find_one({"email": email_lower})

    if not user:
        # For security, you might still return a generic message
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    # Generate a secure reset token and set an expiration (e.g., 1 hour)
    reset_token = secrets.token_urlsafe(32)
    expiration_time = time.time() + 3600  # 1 hour from now

    # Save the token and its expiration in the user's document
    db["users"].update_one(
        {"email": email_lower},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expiration": expiration_time,
            }
        },
    )

    # Build the reset link (adjust the URL to match your frontend route)
    reset_link = (
        f"http://localhost:3000/reset-password?token={reset_token}&email={email_lower}"
    )

    # Send the email with the reset link
    try:
        send_reset_email(email_lower, reset_link)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error sending reset email.",
        )

    return {
        "message": "If an account with that email exists, a password reset email has been sent."
    }


class ResetPasswordRequest(BaseModel):
    token: str
    email: EmailStr
    password: str


@app.post("/reset-user-password")
async def reset_user_password(request_data: ResetPasswordRequest):
    email_lower = request_data.email.lower()
    user = users.find_one({"email": email_lower})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="User not found."
        )

    stored_token = user.get("reset_token")
    token_expiration = user.get("reset_token_expiration", 0)

    # Verify that the token exists and matches, and has not expired
    if not stored_token or stored_token != request_data.token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid token."
        )
    if time.time() > token_expiration:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token expired."
        )

    # Hash the new password
    hashed_password = pwd_context.hash(request_data.password)

    # Update the user's password and remove the reset token fields
    users.update_one(
        {"email": email_lower},
        {
            "$set": {"password": hashed_password},
            "$unset": {"reset_token": "", "reset_token_expiration": ""},
        },
    )

    return {"message": "Password has been reset successfully."}




snaptrade = SnapTrade(
    consumer_key=os.getenv("SNAPTRADE_CONSUMER_KEY"),
    client_id=os.getenv("SNAPTRADE_CLIENT_ID"),
)

@app.get("/snaptrade/link-account")
def get_link_url(user_id: str):
    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found.")

        if "snaptrade_user_secret" in user:
            user_secret = user["snaptrade_user_secret"]
        else:
            register_response = snaptrade.authentication.register_snap_trade_user(
                body={"userId": user_id}
            )
            user_secret = register_response.body["userSecret"]
            store_user_secret(user_id, user_secret)

        login_response = snaptrade.authentication.login_snap_trade_user(
            user_id=user_id,
            user_secret=user_secret,
            custom_redirect="http://localhost:3000/dashboard?from=snaptrade",
            connection_portal_version="v4"
        )


        return {"url": login_response.body}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/snaptrade/holdings")
def get_holdings(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    try:
        user = users.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid user_id")

    user_secret = user.get("snaptrade_user_secret")
    if not user_secret:
        raise HTTPException(status_code=400, detail="User has no SnapTrade secret")

    try:
        holdings = snaptrade.account_information.get_all_user_holdings(
            query_params={"userId": user_id, "userSecret": user_secret}
        )
        return holdings.body
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def store_user_secret(user_id: str, user_secret: str):
    """Store SnapTrade userSecret in MongoDB users collection."""
    users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"snaptrade_user_secret": user_secret}}
    )

def retrieve_user_secret_from_db(user_id: str) -> str:
    """Retrieve SnapTrade userSecret from MongoDB."""
    user = users.find_one({"_id": ObjectId(user_id)})
    if not user or "snaptrade_user_secret" not in user:
        raise Exception("SnapTrade user secret not found.")
    return user["snaptrade_user_secret"]

@app.get("/snaptrade/delete-user")
def delete_snaptrade_user(user_id: str):
    try:
        deleted_response = snaptrade.authentication.delete_snap_trade_user(
            query_params={"userId": user_id}
        )

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$unset": {"snaptrade_user_secret": ""}}
        )

        return {
            "message": f"SnapTrade user {user_id} deleted successfully.",
            "snaptrade_response": deleted_response.body
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/snaptrade/has-user-secret", response_model=bool)
def has_user_secret(user_id: str) -> bool:
    """Return True if user has SnapTrade secret stored."""
    user = users.find_one({"_id": ObjectId(user_id)})
    return "snaptrade_user_secret" in user

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)

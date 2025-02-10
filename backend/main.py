from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv
from typing import Optional
from passlib.context import CryptContext
import os
import time

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# MongoDB connection
client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]

# Create a password hashing context (using bcrypt)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Stock Dashboard API!"}

#================================================================================================================================
# === /search endpoints =========================================================================================================
#================================================================================================================================
assets = db["assets"]   # db collection w/ basic asset information
# assets don't change, so we can cache it for a day
cache = {}
CACHE_EXPIRATION_TIME = 86400   # 1 day = 86400 seconds

@app.get("/search")
async def get_assets(query: str = Query(None, min_length=1)):
    """ returns basic info for assets that match the search bar query """
    global cache

    current_time = time.time()

    # if cached data is available and not expired, return the cache. Otherwise, query the DB
    if query in cache and (current_time - cache[query]["timestamp"]) < CACHE_EXPIRATION_TIME:
        return cache[query]["data"]

    query = query.lower()

    # query DB based on prefix
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
        {"_id": 0, "Ticker": 1, "IconURL": 1, "Name": 1, "Country": 1, "Exchange": 1, "CountryFlag": 1}
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

    cache[query] = {
        "data": assets_list,
        "timestamp": current_time
    }

    return assets_list

#================================================================================================================================
# === /watchlist endpoints ======================================================================================================
#================================================================================================================================
watchlists = db["watchlists"]   # db collection w/ user watchlists

class WatchlistTicker(BaseModel):
    """ each ticker in watchlist has a ticker, full name, and image src URL"""
    Ticker: str
    FullName: str
    Icon: str

class WatchlistRequest(BaseModel):
    """ watchlist request takes in a UserID, Ticker to add/remove, and the full name + icon src URL"""
    ID: str
    Ticker: str
    FullName: Optional[str] = None  # optional for remove requests
    Icon: Optional[str] = None      # optional for remove requests

class WatchlistResponse(BaseModel):
    """ watchlist response outputs list of tickers (watchlist) associated with the UserID"""
    Tickers: list[WatchlistTicker]

@app.get("/watchlist/{ID}", response_model=WatchlistResponse)
def get_watchlist(ID: str):
    """ returns watchlist associated with UserID """

    mongo_id = ObjectId(ID)
    watchlist = watchlists.find_one({"_id": mongo_id})

    if watchlist:
        return {"Tickers": watchlist["Tickers"]}
    
    return {"Tickers": []}

@app.post("/watchlist/add", response_model=WatchlistResponse)
async def add_to_watchlist(request: WatchlistRequest):
    """ adds requested ticker to user's watchlist"""

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
        if not any(ticker["Ticker"] == request.Ticker for ticker in watchlist["Tickers"]):
            watchlists.update_one(
                {"_id": mongo_id},
                {"$push": {"Tickers": ticker_details}},
            )
    else:
        watchlists.insert_one({"_id": mongo_id, "Tickers": [ticker_details]})
    
    return get_watchlist(request.ID)

@app.post("/watchlist/remove")
async def remove_from_watchlist(request: WatchlistRequest):
    """ removes requested ticker from user's watchlist"""
    try:
        mongo_id = ObjectId(request.ID)
        ticker = request.Ticker

        watchlist_collection = watchlists.find_one({"_id": mongo_id})

        # check if ticker is in user's watchlist
        ticker_exists = any(item["Ticker"] == ticker for item in watchlist_collection.get("Tickers", []))
        if ticker_exists:
            watchlists.update_one(
                {"_id": mongo_id},
                {"$pull": {"Tickers": {"Ticker": ticker}}}
            )
        
        return {"success": True}

    except Exception:
        return {"success": False}
    
    
    # ==============================================================================================================
# Authentication Endpoints (Login & Signup)
# ==============================================================================================================

users = db["users"]  # New collection for storing user documents

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
            detail="User with this email already exists."
        )
    # Hash the password (in production, never store plain-text passwords)
    hashed_password = pwd_context.hash(user.password)
    new_user = {
        "email": user.email,
        "username": user.username,
        "password": hashed_password
    }
    result = users.insert_one(new_user)
    return {
        "message": "User created successfully.",
        "user_id": str(result.inserted_id)
    }

@app.post("/login")
async def login(user: UserLogin):
    existing_user = users.find_one({"email": user.email})
    if not existing_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )
    if not pwd_context.verify(user.password, existing_user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials."
        )
    # In a real application, you would generate and return an auth token here.
    return {
        "message": "Login successful.",
        "user": {
            "email": existing_user["email"],
            "username": existing_user["username"],
            "user_id": str(existing_user["_id"])
        }
    }
    
    

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
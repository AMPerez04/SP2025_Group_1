from fastapi import FastAPI
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import time

load_dotenv()

app = FastAPI()

# Connect to MongoDB
client = MongoClient(os.getenv("MONGO_URI"))
db = client["stock_dashboard"]

@app.get("/")
def read_root():
    return {"message": "Welcome to the Stock Dashboard API!"}

# --- /search endpoint ---
assets = db["assets"]   # db collection w/ basic asset information
# assets doesn't change, so we can cache it for a day
cache = None
cache_timestamp = 0
CACHE_EXPIRATION_TIME = 86400 # 1 day

@app.get("/search")
async def get_assets():
    """ gets basic info from all assets in DB --> displayed in search bar autocomplete """
    global cache, cache_timestamp

    current_time = time.time()

    if cache and (current_time - cache_timestamp) < CACHE_EXPIRATION_TIME:
        return cache

    assets_cursor = assets.find({}, {"_id": 0, "Ticker": 1, "Name": 1, "Exchange": 1, "Flag": 1, "Country": 1})
    
    assets_dict = []
    for asset in assets_cursor:
        assets_dict.append({
            "ticker": asset.get("Ticker", ""),
            "full_name": asset.get("Name", ""),
            "market": asset.get("Exchange", ""),
            "country": asset.get("Country", ""),
            "country_flag": asset.get("Flag", "")
        })

    cache = assets_dict
    cache_timestamp = current_time

    return cache

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

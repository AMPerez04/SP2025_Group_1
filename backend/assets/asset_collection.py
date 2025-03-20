import json
import requests
import pycountry
import os
import zipfile
import shutil
from pymongo import MongoClient

current_directory = os.path.join(os.getcwd(), 'assets')
assets_json_path = os.path.join(current_directory, 'assets.json')

def upload_mongo():
    client = MongoClient(os.getenv("MONGO_URL"))
    db = client["stock_dashboard"]
    collection = db["assets"]

    with open(assets_json_path, 'r') as file:
        data = json.load(file)

    collection.delete_many({})
    collection.insert_many(data)
    print('Successfully uploaded assets to MongoDB')

def main():
    print('Uploading assets to MongoDB')
    # download zipped ticker_icons directory from GitHub repo --> to be deleted later
    response = requests.get('https://github.com/nvstly/icons/archive/refs/heads/main.zip')

    if response.status_code == 200:
        zip_file_path = os.path.join(current_directory, 'icons.zip')
        with open(zip_file_path, 'wb') as zip_file:
            zip_file.write(response.content)

        with zipfile.ZipFile(zip_file_path, 'r') as zip_ref:
            zip_ref.extractall(current_directory)
        extracted_icons_dir = os.path.join(current_directory, 'icons-main/ticker_icons')
        shutil.move(extracted_icons_dir, os.path.join(current_directory, 'ticker_icons'))
        shutil.rmtree(os.path.join(current_directory, 'icons-main'))
        os.remove(zip_file_path)
    else:
        print("ERROR: Failed to download ticker_icons")
        exit()

    # process the relevant info from each exchange's JSON
    exchanges = {
        "NASDAQ": 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/refs/heads/main/nasdaq/nasdaq_full_tickers.json',
        "AMEX": 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/refs/heads/main/amex/amex_full_tickers.json',
        "NYSE": 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/refs/heads/main/nyse/nyse_full_tickers.json'
    }

    asset_data = []
    for exchange, url in exchanges.items():
        response = requests.get(url)
        if response.status_code != 200:
            print(f"ERROR: Failed to fetch {exchange}")
            continue

        data = response.json()
        exchange_data = []

        for asset in data:
            ticker = asset.get('symbol')
            name = asset.get('name')
            country = asset.get('country')
            sector = asset.get('sector')
            exchange_logo = f"https://s3-symbol-logo.tradingview.com/source/{exchange}.svg"

            # only keep assets with valid ticker images
            ticker_img = os.path.join(current_directory, 'ticker_icons', f"{ticker}.png")
            if not os.path.isfile(ticker_img):
                continue

            ticker_icon = f"https://raw.githubusercontent.com/nvstly/icons/refs/heads/main/ticker_icons/{ticker}.png"

            # only keep assets with valid country flag images
            try:
                country_obj = pycountry.countries.get(name=country)
                if not country_obj:
                    raise Exception()
                
                country_flag = f"https://s3-symbol-logo.tradingview.com/country/{country_obj.alpha_2}.svg"
            except Exception:
                continue

            exchange_data.append({
                'Ticker': ticker,
                'Name': name,
                'Country': country,
                'Exchange': exchange,
                'CountryFlag': country_flag,
                'IconURL': ticker_icon,
                'Sector': sector,
                'ExchangeLogo': exchange_logo
            })

        asset_data.extend(exchange_data)

    # convert to JSON --> upload data to MongoDB --> delete local copies
    try:
        with open(assets_json_path, 'w') as outfile:
            json.dump(asset_data, outfile, indent=4)

        upload_mongo()
    except Exception as e:
        print("ERROR: Failed to upload assets.json to MongoDB")
        print(e)
    finally:
        shutil.rmtree(os.path.join(current_directory, 'ticker_icons'))
        os.remove(os.path.join(current_directory, assets_json_path))

if __name__ == '__main__':
    main()

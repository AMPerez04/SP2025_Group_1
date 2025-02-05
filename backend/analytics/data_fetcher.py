# backend/analytics/data_fetcher.py
import yfinance as yf
import pandas as pd

def fetch_stock_data(ticker: str, period: str = "1y") -> pd.DataFrame:
    stock = yf.Ticker(ticker)
    data = stock.history(period=period)
    return data

def fetch_multiple_stock_data(tickers: list[str], period: str = "1y") -> dict[str, pd.DataFrame]:
    data = {}
    for ticker in tickers:
        stock_data = fetch_stock_data(ticker, period)
        # Convert DataFrame to a list of dictionaries and convert numpy types to native Python types
        data[ticker] = stock_data.reset_index().to_dict(orient="records")
    return data
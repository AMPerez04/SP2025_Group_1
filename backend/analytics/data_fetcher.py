# backend/analytics/data_fetcher.py
import yfinance as yf
import pandas as pd

def fetch_stock_data(ticker: str, period: str = "1y") -> pd.DataFrame:
    stock = yf.Ticker(ticker)
    data = stock.history(period=period)
    return data

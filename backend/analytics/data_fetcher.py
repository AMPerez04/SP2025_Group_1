# backend/analytics/data_fetcher.py
import yfinance as yf
import logging
import pandas as pd

logging.basicConfig(
    level=logging.INFO,
    filename="backend.log",
    filemode="a",
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def fetch_stock_data(
    ticker: str, period: str = "1y", interval: str = "1d"
) -> dict:
    """
    Fetches stock data for a given ticker symbol

    Args:
        ticker: Stock ticker symbol
        period: Time period to fetch
        interval: Time interval between data points
        is_prediction: Whether data is for prediction
    Returns:
        Dictionary with stock data formatted for frontend/model
    """

    try:
        stock_data = yf.download(
            tickers=ticker, period=period, interval=interval, group_by="ticker"
        )

        if stock_data.empty:
            raise ValueError(f"No data available for ticker {ticker}")
        
        # Convert index to NY timezone
        if stock_data.index.tz is None:
            stock_data.index = stock_data.index.tz_localize('UTC')
        stock_data.index = stock_data.index.tz_convert('America/New_York')

        # Adjust dates for weekly data to show Friday instead of Monday
        if interval == "1wk":
            stock_data.index = stock_data.index + pd.Timedelta(days=4)
            

        result = {ticker: {}}
        for column in ["Open", "High", "Low", "Close", "Volume"]:
            result[ticker][column] = {
                date.isoformat(): float(value)
                for date, value in zip(stock_data.index, stock_data[(ticker, column)])
                if pd.notna(value)
            }

        return result

    except Exception as e:
        raise ValueError(f"Error fetching data for ticker {ticker}: {e}")

def get_market_status():
    """
    Checks if the market is currently open via yfinance
    """
    return yf.Market("US").status['status']=='open'
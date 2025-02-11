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
    ticker: str, period: str = "1y", interval: str = "1d", is_prediction: bool = False
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

        logger.info(
            f"length of data: {len(stock_data)} for period {period} and interval {interval}"
        )
        result = {ticker: {}}
        for column in ["Open", "High", "Low", "Close", "Volume"]:
            result[ticker][column] = {
                str(date): float(value)
                for date, value in zip(stock_data.index, stock_data[(ticker, column)])
                if pd.notna(value)
            }

        return result

    except Exception as e:
        logger.error(f"Error fetching data for ticker(s) {ticker}: {str(e)}")
        raise

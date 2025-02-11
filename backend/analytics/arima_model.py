# backend/analytics/arima_model.py
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
import logging
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    filename="backend.log",
    filemode="a",
    format="%(asctime)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

pdq_map = {
    "1d": {
        "1m": (1, 0, 1),
        "5m": (1, 0, 1),
        "15m": (2, 0, 2),
        "30m": (2, 0, 2),
        "1h": (2, 0, 2),
    },
    "5d": {
        "5m": (1, 0, 1),
        "15m": (2, 0, 2),
        "30m": (2, 0, 2),
        "1h": (2, 0, 2),
    },
    "1mo": {
        "1h": (2, 1, 2),
        "1d": (2, 1, 2),
    },
    "3mo": {
        "1d": (3, 1, 3),
        "1wk": (2, 1, 2),
    },
    "6mo": {
        "1d": (3, 1, 3),
        "1wk": (2, 1, 2),
    },
    "1y": {
        "1d": (3, 1, 3),
        "1wk": (2, 1, 2),
        "1mo": (2, 1, 2),
    },
    "2y": {
        "1wk": (3, 1, 3),
        "1mo": (3, 1, 3),
    },
    "5y": {
        "1wk": (3, 1, 3),
        "1mo": (3, 1, 3),
    },
    "10y": {
        "1mo": (3, 1, 3),
    },
    "ytd": {
        "1m": (1, 1, 1),  
        "5m": (1, 1, 1),  
        "15m": (1, 1, 1), 
        "30m": (1, 1, 1), 
        "1h": (2, 1, 1),  
        "1d": (3, 1, 3),  
        "1wk": (2, 1, 2), 
    },
    "max": {
        "1mo": (3, 1, 3),
    },
}


def get_ytd_intervals() -> list[str]:
    """
    Get appropriate intervals for YTD based on current date
    """
    today = datetime.now()
    start_of_year = datetime(today.year, 1, 1)
    days_ytd = (today - start_of_year).days

    if days_ytd <= 7:
        return ["1m", "5m", "15m", "30m", "1h", "1d"]  
    elif days_ytd <= 60:
        return ["5m", "15m", "30m", "1h", "1d"] 
    else:
        return ["1d", "1wk"]  

period_interval_map = {
    "1d": ["1m", "5m", "15m", "30m", "1h"],
    "5d": ["5m", "15m", "30m", "1h"],
    "1mo": ["1h", "1d"],
    "3mo": ["1d", "1wk"],
    "6mo": ["1d", "1wk"],
    "1y": ["1d", "1wk", "1mo"],
    "2y": ["1wk", "1mo"],
    "5y": ["1wk", "1mo"],
    "10y": ["1mo"],
    "ytd": get_ytd_intervals(),
    "max": ["1mo"],
}

def get_ytd_steps() -> dict[str, int]:
    """
    Get appropriate step sizes for YTD predictions based on current date
    Returns step counts that result in ~24 hour forecasts for intraday
    and ~5 day forecasts for daily/weekly
    """
    today = datetime.now()
    start_of_year = datetime(today.year, 1, 1)
    days_ytd = (today - start_of_year).days

    if days_ytd <= 7:
        return {
            "1m": 60,  
            "5m": 12,  
            "15m": 8,  
            "30m": 8,  
            "1h": 8,  
            "1d": 5,  
        }
    elif days_ytd <= 60:
        return {
            "5m": 72,  
            "15m": 32, 
            "30m": 24,  
            "1h": 12,  
            "1d": 5,  
        }
    else:
        return {"1d": 10, "1wk": 4}  


period_step_map = {
    "1d": {"1m": 10, "5m": 6, "15m": 4, "30m": 2, "1h": 1},
    "5d": {"5m": 20, "15m": 10, "30m": 6, "1h": 4},
    "1mo": {"1h": 12, "1d": 5},
    "3mo": {"1d": 15, "1wk": 4},
    "6mo": {"1d": 30, "1wk": 8},
    "1y": {"1d": 50, "1wk": 12, "1mo": 3},
    "2y": {"1wk": 24, "1mo": 6},
    "5y": {"1wk": 50, "1mo": 12},
    "10y": {"1mo": 24},
    "ytd": get_ytd_steps(),
    "max": {"1mo": 36},
}


def train_arima_model(df: pd.DataFrame, period: str, interval: str) -> object:
    """
    Train an ARIMA model on the provided data

    Args:
        df: DataFrame with price data
        period: Time period of data
        interval: Time interval of data
    """

    min_points = {
        "1d": {
            "1m": 30,
            "5m": 6,
            "15m": 4,
            "30m": 4,
            "1h": 4,
        },
        "5d": {
            "5m": 24,
            "15m": 16,
            "30m": 12,
            "1h": 8,
        },
        "ytd": {
            "5m": 72,
            "15m": 32,
            "30m": 24,
            "1h": 12,
            "1d": 5, 
            "1wk": 4,
        },
        "default": {
            "1d": 20,
            "1wk": 8,
            "1mo": 12,
        },
    }

    if period in min_points:
        required_points = min_points[period].get(
            interval, min_points["default"].get(interval, 30)
        )
    else:
        required_points = min_points["default"].get(interval, 30)

    if len(df) < required_points:
        raise ValueError(
            f"Not enough data points. Need at least {required_points} for {period}/{interval}"
        )

    df["Close"] = df["Close"].ffill().bfill()

    if df["Close"].isnull().any() or df["Close"].std() == 0:
        raise ValueError("Invalid data: contains null values or no price variation")

    order = pdq_map[period][interval]

    try:
        model = ARIMA(df["Close"], order=order)
        model_fit = model.fit()
        return model_fit
    except Exception as e:
        logger.error(f"Error training ARIMA model: {str(e)}")
        raise


def predict_arima_model(model, period, interval):
    """
    Make predictions using the trained ARIMA model.

    :param model: Trained ARIMA model.
    :param period: The period for which to make predictions.
    :param interval: The interval for which to make predictions.
    :return forecast: Forecasted values.
    :return steps: Number of steps ahead to forecast.


    """
    steps = period_step_map[period][interval]
    logger.info(f"Making predictions for {steps} steps ahead.")

    try:
        forecast = model.forecast(steps=steps)
        if isinstance(forecast, pd.Series):
            forecast = forecast.astype(float)
        else:
            forecast = pd.Series(forecast).astype(float)

        return forecast, steps

    except Exception as e:
        logger.error(f"Error making forecast: {str(e)}")
        raise ValueError(f"Error making forecast: {str(e)}")


class ARIMAPredictor:
    def __init__(self, df: pd.DataFrame, period: str, interval: str):
        self.df = df
        self.period = period
        self.interval = interval
        self.model = None

    def train(self):
        """Train the ARIMA model with appropriate parameters"""
        order = pdq_map[self.period][self.interval]
        self.model = ARIMA(self.df["Close"], order=order)
        self.model_fit = self.model.fit()
        return self.model_fit

    def predict(self) -> tuple[pd.Series, int]:
        """Make predictions using the trained model"""
        if not self.model_fit:
            raise ValueError("Model must be trained before predicting")

        steps = period_step_map[self.period][self.interval]
        forecast = self.model_fit.forecast(steps=steps)
        return forecast, steps

    @staticmethod
    def validate_data(df: pd.DataFrame, interval: str) -> bool:
        """Validate that we have enough data points for training"""
        min_points = {
            "1m": 60,
            "5m": 24,
            "15m": 16,
            "30m": 12,
            "1h": 8,
            "1d": 30,
            "1wk": 12,
            "1mo": 12,
        }
        required_points = min_points.get(interval, 30)
        return len(df) >= required_points

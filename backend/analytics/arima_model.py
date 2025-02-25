# backend/analytics/arima_model.py
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA, ARIMAResults
import logging
from datetime import datetime
from pandas.tseries.offsets import BDay, BusinessHour, CustomBusinessDay
from pandas.tseries.holiday import USFederalHolidayCalendar

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


# def train_arima_model(df: pd.DataFrame, period: str, interval: str) -> tuple[ARIMAResults, pd.DatetimeIndex]:
#     """
#     Train an ARIMA model on the provided data

#     Args:
#         df: DataFrame with price data
#         period: Time period of data
#         interval: Time interval of data
#     """

#     min_points = {
#         "1d": {
#             "1m": 30,
#             "5m": 6,
#             "15m": 4,
#             "30m": 4,
#             "1h": 4,
#         },
#         "5d": {
#             "5m": 24,
#             "15m": 16,
#             "30m": 12,
#             "1h": 8,
#         },
#         "ytd": {
#             "5m": 72,
#             "15m": 32,
#             "30m": 24,
#             "1h": 12,
#             "1d": 5,
#             "1wk": 4,
#         },
#         "default": {
#             "1d": 20,
#             "1wk": 8,
#             "1mo": 12,
#         },
#     }

#     if period in min_points:
#         required_points = min_points[period].get(
#             interval, min_points["default"].get(interval, 30)
#         )
#     else:
#         required_points = min_points["default"].get(interval, 30)

#     if len(df) < required_points:
#         raise ValueError(
#             f"Not enough data points. Need at least {required_points} for {period}/{interval}"
#         )

#     df["Close"] = df["Close"].ffill().bfill()

#     if df["Close"].isnull().any() or df["Close"].std() == 0:
#         raise ValueError("Invalid data: contains null values or no price variation")

#     order = pdq_map[period][interval]

#     try:
        
#         model = ARIMA(df["Close"], order=order)
#         model_fit = model.fit()
#         return model_fit,df.index
#     except Exception as e:
#         logger.error(f"Error training ARIMA model: {str(e)}")
#         raise

def train_arima_model(df: pd.DataFrame, period: str, interval: str) -> tuple[ARIMAResults, pd.DatetimeIndex]:
    """Train ARIMA model with validation"""
    logger.info(f"Initial data shape: {df.shape}")
    logger.info(f"Initial data head:\n{df.head()}")
    logger.info(f"Any nulls in input: {df['Close'].isnull().any()}")
    if df["Close"].isnull().any() or df["Close"].std() == 0:
        logger.error("Invalid data: contains null values or no price variation")
        raise ValueError("Invalid data: contains null values or no price variation")

    # Make data stationary by differencing
    differenced = df["Close"].diff().dropna()
    logger.info(f"After differencing - any nulls: {differenced.isnull().any()}")

    
    # Start with predefined order from pdq_map
    best_order = pdq_map[period][interval]
    logger.info(f"Using initial order {best_order} from pdq_map")
    
    try:
        # Try predefined order first
        model = ARIMA(df["Close"], order=best_order)
        model_fit = model.fit()
        logger.info(f"Model fit params: {model_fit.params}")
        logger.info(f"Model AIC: {model_fit.aic}")
        
        # # If predefined fails, try grid search
        # if pd.isna(model_fit.aic):
        #     best_aic = float("inf")
        #     best_order = None
            
        #     for p in range(0, 3):
        #         for d in range(0, 2):
        #             for q in range(0, 3):
        #                 try:
        #                     model = ARIMA(df["Close"], order=(p, d, q))
        #                     model_fit = model.fit()
        #                     if model_fit.aic < best_aic:
        #                         best_aic = model_fit.aic
        #                         best_order = (p, d, q)
        #                 except Exception as e:
        #                     logger.error(f"Error trying ARIMA({p},{d},{q}): {str(e)}")
        #                     continue
            
        #     if best_order is None:
        #         raise ValueError("Could not find valid ARIMA parameters")
                
            # # Train final model with best parameters
            # model = ARIMA(df["Close"], order=best_order)
            # model_fit = model.fit()
        
        # # Validate model
        # residuals = pd.DataFrame(model_fit.resid)
        # if residuals.isnull().any().any():
        #     raise ValueError("Model validation failed: residuals contain NaN values")
        
        
        return model_fit, df.index

    except Exception as e:
        logger.error(f"Error in ARIMA model training: {str(e)}")
        raise

def predict_arima_model(model_fit: ARIMAResults, last_timestamp: pd.Timestamp, period: str, interval: str):
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
        # Get raw forecast values
        forecast_values = model_fit.forecast(steps=steps)
        logger.info(f"Raw forecast values: {forecast_values}")
        
        if pd.isna(forecast_values).any():
            logger.error("NaN values in raw forecast")
            raise ValueError("ARIMA model produced NaN forecasts")

        # Ensure timezone
        if last_timestamp.tz is None:
            last_timestamp = pd.Timestamp(last_timestamp, tz='UTC').tz_convert('America/New_York')
        
        # Generate forecast dates
        if interval.endswith('m') or interval.endswith('h'):
            future_dates = generate_forecast_times(last_timestamp, steps, interval)
        else:
            # For daily/weekly/monthly intervals
            freq = get_freq_unit(interval)
            next_trading_time = get_next_market_time(last_timestamp)
            future_dates = pd.date_range(
                start=next_trading_time,
                periods=steps,
                freq=freq,
                tz='America/New_York'
            )

        logger.info(f"Generated future dates: {future_dates}")
        logger.info(f"length of future dates and forecast values: {len(future_dates)} and {len(forecast_values)}")
        logger.info(f"forecast values: {forecast_values}")
        # Create forecast series
        forecast = pd.Series(
            data=forecast_values[:len(future_dates)],
            index=future_dates,
            name="predicted_mean"
        )
        logger.info(f"Final forecast series: {forecast}")
        
        return forecast, steps

    except Exception as e:
        logger.error(f"Error making forecast: {str(e)}")
        raise ValueError(f"Error making forecast: {str(e)}")


def get_freq_unit(interval: str) -> str:
    """Get pandas frequency string for market-aware intervals"""
    us_calendar = USFederalHolidayCalendar()
    trading_day = CustomBusinessDay(calendar=us_calendar)    
    if interval.endswith("m"):
        # For minute intervals, use business hours + minutes
        minutes = int(interval[:-1])
        return CustomBusinessDay(
            calendar=us_calendar,
            # start='9:30',
            # end='16:00',
            offset=pd.Timedelta(minutes=minutes)
        )
    elif interval.endswith("h"):
        # For hourly intervals during market hours
        return BusinessHour(start='9:30', end='16:00')
    elif interval == "1d":
        return trading_day  # Business days only
    elif interval == "1wk":
        return "W-FRI"  # Weekly data anchored to Fridays
    else:  # 1mo
        return "BM"  # Business month end
    
def get_next_market_time(timestamp: pd.Timestamp) -> pd.Timestamp:
    """
    Get next valid market time, handling overnight, weekend and holiday transitions.
    
    Args:
        timestamp: Current timestamp to check
    Returns:
        Next valid market timestamp
    """
    if timestamp.tz is None:
        timestamp = pd.Timestamp(timestamp, tz='UTC').tz_convert('America/New_York')
    elif str(timestamp.tz) != 'America/New_York':
        timestamp = timestamp.tz_convert('America/New_York')

    next_time = timestamp
    
    # If outside market hours, move to next market open
    if (next_time.hour >= 16) or \
       (next_time.hour < 9) or \
       (next_time.hour == 9 and next_time.minute < 30):
        next_time = next_time.replace(hour=9, minute=30)
        if next_time <= timestamp:  # If we're still behind or at current time
            next_time = next_time + pd.Timedelta(days=1)
    
    # Skip weekends
    while next_time.weekday() in [5, 6]:
        next_time = next_time + pd.Timedelta(days=1)
        next_time = next_time.replace(hour=9, minute=30)
    
    # Skip holidays
    us_calendar = USFederalHolidayCalendar()
    holidays = us_calendar.holidays(start=next_time, end=next_time + pd.Timedelta(days=10))
    while next_time.date() in holidays:
        next_time = next_time + pd.Timedelta(days=1)
        next_time = next_time.replace(hour=9, minute=30)
    
    return next_time

def generate_forecast_times(start_time: pd.Timestamp, steps: int, interval: str) -> pd.DatetimeIndex:
    """
    Generate continuous sequence of market-aware timestamps for forecasting.
    
    Args:
        start_time: Last historical timestamp
        steps: Number of prediction steps
        interval: Time interval (e.g. '5m' or '1h')
    Returns:
        DatetimeIndex with forecast timestamps
    """
    if start_time.tz is None:
        start_time = pd.Timestamp(start_time, tz='UTC').tz_convert('America/New_York')
    
    trading_times = []
    current_time = start_time
    minutes = int(interval[:-1]) * 60 if interval.endswith('h') else int(interval[:-1])
    
    while len(trading_times) < steps:
        next_time = current_time + pd.Timedelta(minutes=minutes)
        
        # Check if still within market hours
        if (next_time.hour < 16) and \
           (next_time.hour > 9 or (next_time.hour == 9 and next_time.minute >= 30)):
            trading_times.append(next_time)
            current_time = next_time
        else:
            # Get next valid market time
            next_market_time = get_next_market_time(next_time)
            trading_times.append(next_market_time)
            current_time = next_market_time
    
    return pd.DatetimeIndex(trading_times, tz='America/New_York')
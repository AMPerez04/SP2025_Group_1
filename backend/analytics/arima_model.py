# backend/analytics/arima_model_modular.py
import pandas as pd
import numpy as np
from statsmodels.tsa.arima.model import ARIMA
from pandas.tseries.holiday import USFederalHolidayCalendar
from pandas.tseries.offsets import CustomBusinessDay, BusinessHour
import logging

logger = logging.getLogger(__name__)


# Market Calendar System - handles all time-related operations
class MarketCalendar:
    def __init__(self):
        self.calendar = USFederalHolidayCalendar()

    def is_market_open(self, timestamp: pd.Timestamp) -> bool:
        """Check if given timestamp is within market hours"""
        if timestamp.tz is None:
            timestamp = pd.Timestamp(timestamp, tz="UTC").tz_convert("America/New_York")

        # Check if it's a weekday
        if timestamp.weekday() > 4:  # 5 = Saturday, 6 = Sunday
            return False

        # Check if it's a holiday
        holidays = self.calendar.holidays(start=timestamp, end=timestamp)
        if timestamp.date() in holidays:
            return False

        # Check if within market hours (9:30 AM - 4:00 PM)
        is_within_hours = (
            timestamp.hour > 9 or (timestamp.hour == 9 and timestamp.minute >= 30)
        ) and (timestamp.hour < 16)

        return is_within_hours

    def intervals_until_market_close(
        self, timestamp: pd.Timestamp, interval_minutes: int
    ) -> int:
        """Calculate how many intervals are left until the market closes (4:00 PM EST)"""
        if timestamp.tz is None:
            timestamp = pd.Timestamp(timestamp, tz="UTC").tz_convert("America/New_York")
        elif str(timestamp.tz) != "America/New_York":
            timestamp = timestamp.tz_convert("America/New_York")

        # If the market is already closed
        if timestamp.hour >= 16 or (timestamp.hour == 15 and timestamp.minute >= 30):
            return 0

        # Calculate the number of intervals left until market close
        market_close = timestamp.replace(hour=16, minute=0, second=0)
        remaining_minutes = (market_close - timestamp).total_seconds() / 60
        intervals_left = int(remaining_minutes // interval_minutes)

        return intervals_left

    def get_freq_unit(self, interval: str) -> str:
        """Get pandas frequency string for market-aware intervals"""
        us_calendar = USFederalHolidayCalendar()
        trading_day = CustomBusinessDay(calendar=us_calendar)
        if interval.endswith("m"):
            minutes = int(interval[:-1])
            return CustomBusinessDay(
                calendar=us_calendar,
                offset=pd.Timedelta(minutes=minutes),
            )
        elif interval.endswith("h"):
            return BusinessHour(start="9:30", end="16:00")
        elif interval == "1d":
            return trading_day
        elif interval == "1wk":
            return "W-FRI"
        else:
            return "BM"

    def get_next_market_timestamp(self, timestamp: pd.Timestamp) -> pd.Timestamp:
        """Find next valid market time, handling overnight, weekend and holiday transitions"""
        if timestamp.tz is None:
            timestamp = pd.Timestamp(timestamp, tz="UTC").tz_convert("America/New_York")
        elif str(timestamp.tz) != "America/New_York":
            timestamp = timestamp.tz_convert("America/New_York")

        next_time = timestamp

        # If outside market hours, move to next market open
        if (
            (next_time.hour >= 16)
            or (next_time.hour < 9)
            or (next_time.hour == 9 and next_time.minute < 30)
        ):
            next_time = next_time.replace(hour=9, minute=30)
            if next_time <= timestamp:
                next_time = next_time + pd.Timedelta(days=1)

        # Skip weekends
        while next_time.weekday() in [5, 6]:  # 5 = Saturday, 6 = Sunday
            next_time = next_time + pd.Timedelta(days=1)
            next_time = next_time.replace(hour=9, minute=30)

        # Skip holidays
        holidays = self.calendar.holidays(
            start=next_time, end=next_time + pd.Timedelta(days=10)
        )
        while next_time.date() in holidays:
            next_time = next_time + pd.Timedelta(days=1)
            next_time = next_time.replace(hour=9, minute=30)

        return next_time

    def generate_forecast_dates(
        self, start: pd.Timestamp, interval: str, steps: int
    ) -> pd.DatetimeIndex:
        """Generate sequence of market-aware forecast timestamps"""
        if start.tz is None:
            start = pd.Timestamp(start, tz="UTC").tz_convert("America/New_York")

        trading_times = []
        current_time = start

        if interval.endswith("m"):
            minutes = int(interval[:-1])
        elif interval.endswith("h"):
            minutes = int(interval[:-1]) * 60
        else:
            # For daily/weekly/monthly intervals, use simple date range
            freq = self.get_freq_unit(interval)
            next_trading_time = self.get_next_market_timestamp(start)
            return pd.date_range(
                start=next_trading_time, periods=steps, freq=freq, tz="America/New_York"
            )

        while len(trading_times) < steps:
            #     intervals_left = self.intervals_until_market_close(current_time, minutes)
            #     if intervals_left > 0:
            #         next_time = current_time + pd.Timedelta(minutes=minutes)
            #         # Only add if it would be a new unique timestamp
            #         if not trading_times or next_time > trading_times[-1]:
            #             trading_times.append(next_time)
            #             current_time = next_time
            #         else:
            #             # Move to next market day if we would create a duplicate
            #             current_time = self.get_next_market_timestamp(current_time)
            #     else:
            #         # Move to start of next market day
            #         current_time = self.get_next_market_timestamp(current_time)
            #         # Only add the timestamp if it would be unique
            #         if not trading_times or current_time > trading_times[-1]:
            #             trading_times.append(current_time)
            if self.is_market_open(current_time):
                trading_times.append(current_time)
                current_time = current_time + pd.Timedelta(minutes=minutes)
            else:
                current_time = self.get_next_market_timestamp(current_time)

        return pd.DatetimeIndex(trading_times, tz="America/New_York")


# Model Configuration System - separates parameter configuration
class ModelConfig:
    # Default ARIMA parameters by period and interval
    PDQ_MAP = {
        "1d": {
            "1m": (1, 0, 1),
            "5m": (1, 0, 1),
            "15m": (1, 0, 1),
            "30m": (2, 1, 0),
            "1h": (1, 1, 1),
        },
        "5d": {"5m": (1, 1, 1), "15m": (1, 1, 2), "30m": (0, 1, 1), "1h": (1, 1, 0)},
        "1mo": {"1h": (1, 1, 0), "1d": (1, 0, 0)},
        "3mo": {"1d": (1, 1, 0), "1wk": (1, 0, 0)},
        "6mo": {"1d": (0, 1, 1), "1wk": (1, 0, 0)},
        "1y": {"1d": (2, 1, 2), "1wk": (1, 0, 0), "1mo": (1, 0, 0)},
        "2y": {"1wk": (0, 1, 1), "1mo": (1, 0, 0)},
        "5y": {"1wk": (0, 1, 1), "1mo": (0, 1, 1)},
        "10y": {"1mo": (0, 1, 1)},
        "ytd": {"1d": (0, 1, 1)},
    }

    # Number of steps to forecast for each period/interval combination
    PERIOD_STEP_MAP = {
        "1d": {"1m": 60, "5m": 30, "15m": 20, "30m": 16, "1h": 10},
        "5d": {"5m": 30, "15m": 20, "30m": 16, "1h": 12},
        "1mo": {"1h": 12, "1d": 10},
        "3mo": {"1d": 15, "1wk": 4},
        "6mo": {"1d": 20, "1wk": 6},
        "1y": {"1d": 20, "1wk": 8, "1mo": 3},
        "2y": {"1wk": 8, "1mo": 3},
        "5y": {"1wk": 8, "1mo": 6},
        "10y": {"1mo": 6},
        "ytd": {"1d": 15},
    }

    @staticmethod
    def get_default_parameters(period: str, interval: str) -> tuple:
        """Get default ARIMA parameters for the period/interval"""
        try:
            return ModelConfig.PDQ_MAP[period][interval]
        except KeyError:
            logger.warning(
                f"No default parameters for {period}/{interval}, using (1,0,1)"
            )
            return (1, 0, 1)

    @staticmethod
    def get_forecast_steps(period: str, interval: str) -> int:
        """Get the number of steps to forecast for period/interval"""
        try:
            return ModelConfig.PERIOD_STEP_MAP[period][interval]
        except KeyError:
            logger.warning(f"No step config for {period}/{interval}, using 10")
            return 10


# Core forecasting system
class TimeSeriesForecaster:
    def __init__(self, market_calendar: MarketCalendar, config: ModelConfig):
        """
        Initialize the forecaster with market calendar and configuration

        Args:
            market_calendar: Calendar for handling market-specific time operations
            config: Configuration for model parameters
        """
        self.market_calendar = market_calendar
        self.config = config
        self.model_fit = None
        self.training_data = None
        self.last_timestamp = None
        self.period = None
        self.interval = None

    def train(self, data: pd.DataFrame, period: str, interval: str) -> bool:
        """
        Train the forecasting model on historical data

        Args:
            data: DataFrame with Close prices and datetime index
            period: The time period for forecasting
            interval: The time interval for data

        Returns:
            bool: True if training was successful
        """
        self.period = period
        self.interval = interval
        self.training_data = data

        if len(data) < 10:
            logger.error("Not enough data points for training")
            return False

        logger.info(f"Training model for {period}/{interval} with {len(data)} points")
        logger.info(f"Data range: min={data['Close'].min()}, max={data['Close'].max()}")

        # Check for data issues
        if data["Close"].isnull().any() or data["Close"].std() == 0:
            logger.error("Invalid data: contains null values or no price variation")
            return False

        # Store the last timestamp for forecasting
        self.last_timestamp = data.index[-1]

        # Get default parameters and try to fit model
        best_order = self.config.get_default_parameters(period, interval)
        logger.info(f"Using initial model parameters: {best_order}")

        try:
            # Try with default parameters first
            model = ARIMA(data["Close"], order=best_order)
            self.model_fit = model.fit()

            # Test forecast to ensure it doesn't produce NaNs
            steps = self.config.get_forecast_steps(period, interval)
            test_forecast = self.model_fit.forecast(steps=steps)

            if pd.isna(test_forecast).any():
                raise ValueError("Initial model parameters produced NaN forecasts")

            return True

        except Exception as e:
            logger.warning(
                f"Error with default parameters: {str(e)}, trying grid search"
            )

            # Grid search for better parameters
            best_aic = float("inf")
            best_model = None

            for p in range(0, 3):
                for d in range(0, 2):
                    for q in range(0, 3):
                        try:
                            order = (p, d, q)
                            logger.debug(f"Testing ARIMA{order}")
                            model = ARIMA(data["Close"], order=order)
                            model_fit = model.fit()

                            # Verify forecast doesn't produce NaNs
                            test_forecast = model_fit.forecast(steps=1)
                            if (
                                not pd.isna(test_forecast).any()
                                and model_fit.aic < best_aic
                            ):
                                best_aic = model_fit.aic
                                best_model = model_fit
                                logger.info(
                                    f"Found better model with AIC {best_aic}, order={order}"
                                )

                        except Exception as err:
                            logger.debug(f"Error with ARIMA{order}: {str(err)}")
                            continue

            if best_model is not None:
                self.model_fit = best_model
                return True
            else:
                logger.error("Could not find valid model parameters")
                return False

    def forecast(self, steps: int = None) -> "ForecastResult":
        """
        Generate forecast using the trained model

        Args:
            steps: Number of steps to forecast (defaults to config value)

        Returns:
            ForecastResult: Object with forecast series and metadata
        """
        if self.model_fit is None:
            raise ValueError("Model has not been trained yet")

        if steps is None:
            steps = self.config.get_forecast_steps(self.period, self.interval)

        logger.info(f"Forecasting {steps} steps ahead")

        try:
            # Generate the raw forecast values
            forecast_values = self.model_fit.forecast(steps=steps)
            logger.info(f"Raw forecast values: {forecast_values}")

            # Convert forecast values to a simple numpy array
            forecast_array = (
                forecast_values.values
                if hasattr(forecast_values, "values")
                else np.array(forecast_values)
            )

            # Generate appropriate future dates
            future_dates = self.market_calendar.generate_forecast_dates(
                self.last_timestamp, self.interval, steps
            )
            logger.info(f"Generated future dates: {future_dates}")

            # Ensure lengths match before creating Series
            min_length = min(len(future_dates), len(forecast_array))
            logger.info(
                f"Length match: {len(future_dates) == len(forecast_array)}, Lengths: {len(future_dates)}, {len(forecast_array)}"
            )

            # Create forecast series directly from arrays
            forecast_series = pd.Series(
                data=forecast_array[:min_length], index=future_dates[:min_length]
            )
            logger.info(f"Final forecast series: {forecast_series}")

            return ForecastResult(
                historical_series=self.training_data["Close"],
                forecast_series=forecast_series,
            )

        except Exception as e:
            logger.error(f"Error generating forecast: {str(e)}")
            raise


class ForecastResult:
    """Class for handling forecast results with consistent interface"""

    def __init__(self, historical_series: pd.Series, forecast_series: pd.Series):
        """
        Initialize with historical and forecast data

        Args:
            historical_series: Series with historical prices
            forecast_series: Series with forecasted prices
        """
        self.historical = historical_series
        self.forecast = forecast_series
        self.last_historical_point = historical_series.iloc[-1]
        self.last_timestamp = historical_series.index[-1]

    def to_connected_series(self) -> pd.Series:
        """Return forecast with last historical point included for visual continuity"""
        last_point = pd.Series(self.last_historical_point, index=[self.last_timestamp])
        return pd.concat([last_point, self.forecast])

    def to_dict(self, ticker: str = "forecast") -> dict:
        """Convert to frontend-friendly format with specified ticker"""
        connected_series = self.to_connected_series()
        result = {
            ticker: [
                {"time": ts.isoformat(), "value": float(val)}
                for ts, val in connected_series.items()
            ]
        }
        return result

    def __str__(self) -> str:
        """String representation for logging"""
        return f"ForecastResult: {len(self.forecast)} points, starting at {self.forecast.index[0]}"


class ForecastModelFactory:
    """Factory for creating different types of forecasting models"""

    @staticmethod
    def create_model(model_type: str = "arima", **kwargs):
        """
        Create a forecasting model of the specified type

        Args:
            model_type: Type of model to create ('arima', 'exponential_smoothing', etc.)
            **kwargs: Additional arguments to pass to the model constructor

        Returns:
            Forecaster instance
        """
        market_calendar = kwargs.get("market_calendar", MarketCalendar())
        config = kwargs.get("config", ModelConfig())

        if model_type.lower() == "arima":
            return TimeSeriesForecaster(market_calendar, config)
        else:
            raise ValueError(f"Unsupported model type: {model_type}")


# # Example usage
# if __name__ == "__main__":
#     # Setup
#     market_calendar = MarketCalendar()
#     config = ModelConfig()

#     # Create forecaster through factory
#     forecaster = ForecastModelFactory.create_model("arima",
#                                                   market_calendar=market_calendar,
#                                                   config=config)

#     # To train and forecast:
#     # forecaster.train(data, "1y", "1d")
#     # result = forecaster.forecast()
#     # forecast_data = result.to_dict()

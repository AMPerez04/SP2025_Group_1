# backend/analytics/predictor.py
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from pydantic import BaseModel


def train_model(data: pd.DataFrame) -> LinearRegression:
    data["Date"] = data.index
    data["Date"] = data["Date"].map(pd.Timestamp.toordinal)
    X = data[["Date"]]
    y = data["Close"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    model = LinearRegression()
    model.fit(X_train, y_train)
    return model


def predict(model, future_dates: pd.DataFrame) -> pd.DataFrame:
    future_dates["Date"] = future_dates["Date"].map(pd.Timestamp.toordinal)
    predictions = model.predict(future_dates[["Date"]])
    future_dates["Predicted Close"] = predictions
    return future_dates


class PredictRequest(BaseModel):
    days: int

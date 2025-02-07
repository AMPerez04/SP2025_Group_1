# backend/analytics/data_fetcher.py
import yfinance as yf

def fetch_stock_data(
    ticker: str,
    period: str = "1y",
    interval="1d",
) -> dict[str, dict[str, dict[str, float]]]:
    """Fetches stock data for a given ticker symbol or list of ticker symbols."""
    data = {}
    stock_data = yf.download(
        tickers=ticker, period=period, interval=interval, group_by="ticker"
    )

    ticker_data = stock_data[ticker].reset_index().to_dict(orient="list")
    data[ticker] = {}
    for key, values in ticker_data.items():
        if key == 'Date' or key == 'Datetime':
            continue
        try:
            data[ticker][key] = {str(date): value for date, value in zip(ticker_data['Date'], values)}
        except KeyError:
            data[ticker][key] = {str(date): value for date, value in zip(ticker_data['Datetime'], values)}
        except Exception as e:
            print(f"Error: {e}")
            print(f"Key: {key}")
            print(f"Values: {values}")
            print(f"Data: {ticker_data}")
            print(f"Data keys: {ticker_data.keys()}")
            print(f"Data values: {ticker_data.values()}")                
            raise e
    return data


# def fetch_multiple_stock_data(
#     tickers: list[str],
#     period: str = "1y",
#     interval: str = "1d",
# ) -> dict[str, pd.DataFrame]:
#     data = {}
#     for ticker in tickers:
#         stock_data = fetch_stock_data(ticker, period, interval)
#         # Convert DataFrame to a list of dictionaries and convert numpy types to native Python types
#         data[ticker] = stock_data.reset_index().to_dict(orient="records")
#     return data

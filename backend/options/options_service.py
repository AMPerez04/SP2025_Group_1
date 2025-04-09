import yfinance as yf
from fastapi import APIRouter, HTTPException
from typing import (
    List,
    Optional,
    Dict,
    Union,
    # Any,
)
from pydantic import BaseModel
import pandas as pd
import logging
import datetime as dt

# Import our enhanced pricing models
from .options_pricing import (
    calculate_option_price_crr_with_dividends,
    get_risk_free_rate,
    get_dividend_info,
    generate_binomial_tree_visualization,
)

logger = logging.getLogger(__name__)
options_router = APIRouter(prefix="/options", tags=["options"])


class OptionsChain(BaseModel):
    strike: float
    lastPrice: float
    bid: float
    ask: float
    change: float
    percentChange: float
    volume: int
    openInterest: int
    impliedVolatility: float
    ivSource: Optional[str] = None  # Add this field
    inTheMoney: bool
    # Enhanced pricing fields
    europeanPrice: float = 0.0
    americanPrice: float = 0.0
    earlyExerciseValue: float = 0.0
    modelPriceDifference: float = 0.0


class OptionsResponse(BaseModel):
    calls: List[OptionsChain]
    puts: List[OptionsChain]
    expirationDates: List[str]
    selectedDate: str
    underlyingPrice: float = 0.0
    dividendYield: float = 0.0
    interestRate: float = 0.0


class VolatilitySurface(BaseModel):
    """
    VolatilitySurface model for representing the implied volatility surface data.

    This model is used to visualize the implied volatility surface in a 3D plot.
    It includes the grid data for the surface plot, color scale, and other visualization parameters.
    Note: This model is used for Plotly visualization of the IV surface.

    Attributes:
        x (List[float]): List of strike prices.
        y (List[int]): List of days to expiration.
        z (List[List[float]]): 2D array of implied volatility values corresponding to the grid of strikes and days.
        colorscale (str): Color scale for the surface plot (default is "Viridis").
        showscale (bool): Whether to show the color scale (default is True).
        colorbar (Dict): Configuration for the color bar in the plot.
        contour (Dict): Configuration for contour lines on the surface plot.
    """

    type: str = "surface"  # Type of the plot, default is 'surface' for Plotly
    x: List[float]  # Strike prices
    y: List[str]  # Expiration dates as strings (was List[int] for days to expiry)
    z: List[
        List[Optional[float]]
    ]  # Implied Volatility grid (2D array), Allow None in the grid for Plotly to interpolate
    colorscale: str = "Viridis"  # Default colorscale for Plotly
    showscale: bool = True  # Show color scale
    colorbar: Dict[str, Union[str, int, float]] = {
        "title": "IV%",
        "thickness": 20,  # Thickness of the color bar
        "len": 0.75,  # Length of the color bar
    }  # Colorbar configuration
    contour: Dict[str, Dict[str, Union[bool, str, Dict[str, bool]]]] = {
        "z": {
            "show": True,  # Show contour lines
            "usecolormap": True,  # Use the colormap for contours
            "highlightcolor": "#42a5f5",  # Highlight color for contours
            "project": {"z": True},  # Project contours on z-axis
        }
    }  # Contour configuration for the surface plot
    hovertemplate: str = "Strike: %{x}<br>Days: %{y}<br>IV: %{z:.2f}<extra></extra>"  # Hover template for the surface plot, used in Plotly to format hover text


class BinomialTreeNode(BaseModel):
    id: str
    level: int
    position: int
    stock_price: float
    option_price_american: float
    option_price_european: float
    early_exercise: bool


class BinomialTreeLink(BaseModel):
    source: str
    target: str
    probability: float
    direction: str


class BinomialTreeParams(BaseModel):
    up_factor: float
    risk_neutral_probability: float
    risk_free_growth: float
    time_step: float
    steps: int
    option_type: str
    strike: float
    initial_price: float
    interest_rate: float
    volatility: float
    dividend_yield: float


class BinomialTreeResponse(BaseModel):
    nodes: List[BinomialTreeNode]
    links: List[BinomialTreeLink]
    parameters: BinomialTreeParams


@options_router.get("/{ticker}", response_model=OptionsResponse)
async def get_options_chain(ticker: str, expiration_date: Optional[str] = None):
    """Get options chain data for a specific ticker"""
    try:
        # Fetch the stock data
        stock = yf.Ticker(ticker)

        # Get current stock price
        current_price = stock.history(period="1d")["Close"].iloc[-1]

        # Get dividend information
        dividend_info = get_dividend_info(stock)
        div_yield = dividend_info.get("yield", 0)

        # Get all available expiration dates
        expiration_dates = stock.options

        if not expiration_dates or len(expiration_dates) == 0:
            logging.warning(f"No options data available for {ticker}")
            # Return empty data structure instead of throwing an error
            return {
                "calls": [],
                "puts": [],
                "expirationDates": [],
                "selectedDate": "",
                "underlyingPrice": current_price,
                "dividendYield": div_yield,
                "interestRate": get_risk_free_rate(30),
            }

        # If no expiration date provided, use the first available one
        if not expiration_date:
            expiration_date = expiration_dates[0]
        elif expiration_date not in expiration_dates:
            raise HTTPException(
                status_code=400, detail=f"Invalid expiration date: {expiration_date}"
            )

        # Get the options chain for the specified expiration date
        options = stock.option_chain(expiration_date)

        # Handle the case where options might be empty
        if (
            options is None
            or not hasattr(options, "calls")
            or not hasattr(options, "puts")
        ):
            logging.warning(f"Invalid options data for {ticker}")
            return {
                "calls": [],
                "puts": [],
                "expirationDates": expiration_dates,
                "selectedDate": expiration_date,
                "underlyingPrice": current_price,
                "dividendYield": div_yield,
                "interestRate": get_risk_free_rate(30),
            }

        # Calculate days to expiration and other parameters
        exp_date = dt.datetime.strptime(expiration_date, "%Y-%m-%d")
        days_to_expiry = (exp_date - dt.datetime.now()).days
        T = days_to_expiry / 365.0  # Time to expiry in years

        # Get risk-free rate
        r = get_risk_free_rate(days_to_expiry)

        # Convert calls and puts to the expected format

        # For calls section
        calls = []
        if hasattr(options, "calls") and not options.calls.empty:
            for _, call in options.calls.iterrows():
                strike = float(call.strike)
                last_price = (
                    float(call.lastPrice) if not pd.isna(call.lastPrice) else 0.0
                )
                yahoo_iv = (
                    float(call.impliedVolatility)
                    if not pd.isna(call.impliedVolatility)
                    else 0.1
                )

                # Use only Yahoo's IV
                iv_to_use = yahoo_iv

                # Calculate theoretical prices using enhanced CRR model
                pricing_result = calculate_option_price_crr_with_dividends(
                    current_price,
                    strike,
                    T,
                    r,
                    iv_to_use,
                    dividend_info,
                    steps=50,
                    option_type="call",
                )

                european_price = pricing_result["european"]
                american_price = pricing_result["american"]
                early_exercise_value = american_price - european_price

                # Add to calls list (your existing code)
                calls.append(
                    {
                        "strike": strike,
                        "lastPrice": last_price,
                        "bid": float(call.bid) if not pd.isna(call.bid) else 0.0,
                        "ask": float(call.ask) if not pd.isna(call.ask) else 0.0,
                        "change": (
                            float(call.change) if not pd.isna(call.change) else 0.0
                        ),
                        "percentChange": (
                            float(call.percentChange)
                            if not pd.isna(call.percentChange)
                            else 0.0
                        ),
                        "volume": int(call.volume) if not pd.isna(call.volume) else 0,
                        "openInterest": (
                            int(call.openInterest)
                            if not pd.isna(call.openInterest)
                            else 0
                        ),
                        "impliedVolatility": iv_to_use,
                        # "yahooImpliedVolatility": yahoo_iv,  # Not needed in response model
                        # "ourImpliedVolatility": None,        # Not needed in response model
                        "ivSource": "yahoo",
                        "inTheMoney": current_price > strike,
                        "europeanPrice": round(european_price, 4),
                        "americanPrice": round(american_price, 4),
                        "earlyExerciseValue": round(early_exercise_value, 4),
                        "modelPriceDifference": round(last_price - american_price, 4),
                    }
                )

        # Similarly for puts - simplify the entire section
        puts = []
        if hasattr(options, "puts") and not options.puts.empty:
            for _, put in options.puts.iterrows():
                strike = float(put.strike)
                last_price = float(put.lastPrice) if not pd.isna(put.lastPrice) else 0.0
                yahoo_iv = (
                    float(put.impliedVolatility)
                    if not pd.isna(put.impliedVolatility)
                    else 0.1
                )

                # Use only Yahoo's IV
                iv_to_use = yahoo_iv

                # Calculate theoretical prices
                pricing_result = calculate_option_price_crr_with_dividends(
                    current_price,
                    strike,
                    T,
                    r,
                    iv_to_use,
                    dividend_info,
                    steps=50,
                    option_type="put",
                )

                european_price = pricing_result["european"]
                american_price = pricing_result["american"]
                early_exercise_value = american_price - european_price

                # Add to puts list
                puts.append(
                    {
                        "strike": strike,
                        "lastPrice": last_price,
                        "bid": float(put.bid) if not pd.isna(put.bid) else 0.0,
                        "ask": float(put.ask) if not pd.isna(put.ask) else 0.0,
                        "change": float(put.change) if not pd.isna(put.change) else 0.0,
                        "percentChange": (
                            float(put.percentChange)
                            if not pd.isna(put.percentChange)
                            else 0.0
                        ),
                        "volume": int(put.volume) if not pd.isna(put.volume) else 0,
                        "openInterest": (
                            int(put.openInterest)
                            if not pd.isna(put.openInterest)
                            else 0
                        ),
                        "impliedVolatility": iv_to_use,
                        "ivSource": "yahoo",
                        "inTheMoney": strike > current_price,
                        "europeanPrice": round(european_price, 4),
                        "americanPrice": round(american_price, 4),
                        "earlyExerciseValue": round(early_exercise_value, 4),
                        "modelPriceDifference": round(last_price - american_price, 4),
                    }
                )
        return {
            "calls": calls,
            "puts": puts,
            "expirationDates": expiration_dates,
            "selectedDate": expiration_date,
            "underlyingPrice": current_price,
            "dividendYield": div_yield,
            "interestRate": r,
        }
    except Exception as e:
        logging.error(
            f"Error fetching options data for {ticker}: {str(e)}", exc_info=True
        )
        # Return an empty data structure instead of raising an HTTP exception
        return {
            "calls": [],
            "puts": [],
            "expirationDates": [],
            "selectedDate": "",
            "underlyingPrice": 0.0,
            "dividendYield": 0.0,
            "interestRate": 0.0,
        }


@options_router.get("/{ticker}/volatility-surface", response_model=VolatilitySurface)
async def get_volatility_surface(ticker: str, expiration_date: Optional[str] = None):
    """Get implied volatility surface data for visualization."""
    try:
        # Fetch the stock data
        stock = yf.Ticker(ticker)
        history = stock.history(period="1d")
        current_price = history["Close"].iloc[-1] if not history.empty else 0.0

        # Get all expiration dates
        expiration_dates = stock.options
        if not expiration_dates:
            return {"surface": {}, "currentPrice": current_price}

        # Filter to just the selected expiration date if provided
        if expiration_date and expiration_date in expiration_dates:
            # For specified date, get that one + next 4 available dates
            start_idx = expiration_dates.index(expiration_date)
            expiration_dates = expiration_dates[start_idx : start_idx + 5]
        else:
            # Show only next 5 expiry dates
            expiration_dates = expiration_dates[:5]

        # Create coordinate arrays for the surface
        unique_strikes = set()
        unique_dates = []
        all_points = []

        for exp_date in expiration_dates:
            # Get the options chain
            options = await get_options_chain(ticker, exp_date)

            # Format date for readability (YYYY-MM-DD to MMM DD, YYYY)
            formatted_date = dt.datetime.strptime(exp_date, "%Y-%m-%d").strftime(
                "%b %d, %Y"
            )

            if formatted_date not in unique_dates:
                unique_dates.append(formatted_date)

            # Process calls and puts
            for option_list in [options["calls"], options["puts"]]:
                for option in option_list:
                    strike = option["strike"]
                    iv = option["impliedVolatility"]
                    unique_strikes.add(strike)
                    all_points.append(
                        {
                            "strike": strike,
                            "date": formatted_date,  # Use formatted date string
                            "iv": max(iv * 100, 0.001),  # Convert to percentage
                        }
                    )

        # Sort coordinates
        strikes = sorted(list(unique_strikes))
        # unique_dates is already in chronological order

        # Create the 2D grid of z-values
        z_grid = []
        for date in unique_dates:
            z_row = []
            for strike in strikes:
                # Find matching point or interpolate
                matching_points = [
                    p for p in all_points if p["date"] == date and p["strike"] == strike
                ]

                if matching_points:
                    # Average if multiple values exist (call and put for same strike/expiry)
                    z_row.append(
                        sum(p["iv"] for p in matching_points) / len(matching_points)
                    )
                else:
                    # If no exact match, use None for now (Plotly will interpolate)
                    z_row.append(None)

            z_grid.append(z_row)

        # Create the Plotly surface object - note we're using unique_dates directly
        surface = VolatilitySurface(
            type="surface",
            x=strikes,  # Strike prices
            y=unique_dates,  # Use actual date strings instead of days to expiry
            z=z_grid,
            colorscale="Viridis",
            showscale=True,
            colorbar={"title": "IV%", "thickness": 20, "len": 0.75},
            contour={
                "z": {
                    "show": True,
                    "usecolormap": True,
                    "highlightcolor": "#42a5f5",
                    "project": {"z": True},
                }
            },
            hovertemplate="Strike: $%{x}<br>Expiry: %{y}<br>IV: %{z:.2f}%<extra></extra>",
        )

        return surface

    except Exception as e:
        logging.error(
            f"Error generating volatility surface for {ticker}: {str(e)}", exc_info=True
        )
        return VolatilitySurface(
            type="surface",
            x=[0],
            y=["No Data"],  # Use a string instead of number
            z=[[0]],
            colorscale="Viridis",
            showscale=True,
            colorbar={"title": "IV%", "thickness": 20, "len": 0.75},
            contour={
                "z": {
                    "show": True,
                    "usecolormap": True,
                    "highlightcolor": "#42a5f5",
                    "project": {"z": True},
                }
            },
            hovertemplate="Strike: $%{x}<br>Expiry: %{y}<br>IV: %{z:.2f}%<extra></extra>",
        )


@options_router.get("/{ticker}/binomial-tree", response_model=BinomialTreeResponse)
async def get_binomial_tree(
    ticker: str,
    strike: float,
    expiration_date: str,
    option_type: str = "call",
    steps: int = 5,
):
    """Get binomial tree data for visualization"""
    try:
        # Fetch the stock data
        stock = yf.Ticker(ticker)
        current_price = stock.history(period="1d")["Close"].iloc[-1]

        # Get option data to extract implied volatility
        options = stock.option_chain(expiration_date)

        # Calculate days to expiration
        exp_date = dt.datetime.strptime(expiration_date, "%Y-%m-%d")
        days_to_expiry = (exp_date - dt.datetime.now()).days
        T = days_to_expiry / 365.0  # Time to expiry in years

        # Get risk-free rate and dividend info
        r = get_risk_free_rate(days_to_expiry)
        dividend_info = get_dividend_info(stock)
        div_yield = dividend_info.get("yield", 0)

        # Find the option with the closest strike
        if (
            option_type.lower() == "call"
            and hasattr(options, "calls")
            and not options.calls.empty
        ):
            options_chain = options.calls
        elif (
            option_type.lower() == "put"
            and hasattr(options, "puts")
            and not options.puts.empty
        ):
            options_chain = options.puts
        else:
            # Default volatility if no options data
            return HTTPException(
                status_code=404,
                detail="No options data available for the specified parameters",
            )

        # Find closest strike and get implied vol
        closest_option = options_chain.iloc[
            (options_chain["strike"] - strike).abs().argsort()[:1]
        ]
        if closest_option.empty:
            sigma = 0.3  # Default volatility
        else:
            sigma = (
                float(closest_option["impliedVolatility"].iloc[0])
                if not pd.isna(closest_option["impliedVolatility"].iloc[0])
                else 0.3
            )

        # Generate binomial tree visualization data
        tree_data = generate_binomial_tree_visualization(
            current_price, strike, T, r, sigma, div_yield, steps, option_type.lower()
        )

        return tree_data

    except Exception as e:
        logging.error(
            f"Error generating binomial tree for {ticker}: {str(e)}", exc_info=True
        )
        raise HTTPException(
            status_code=500, detail=f"Error generating binomial tree: {str(e)}"
        )

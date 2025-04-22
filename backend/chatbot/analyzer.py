from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import logging
# import pandas as pd
from datetime import datetime
from options.options_service import OptionsResponse
from news.news_service import NewsArticle
import yfinance as yf
from .chatbot_service import openai_client

# Set up logging
logger = logging.getLogger(__name__)

# Create a router
analyzer_router = APIRouter(prefix="/chatbot", tags=["analyzer"])


class TechnicalIndicator(BaseModel):
    name: str  # "SMA", "EMA", "RSI", "BB"
    values: List[float]  # Latest values
    interpretation: Optional[str] = None  # "bullish", "bearish", "neutral"


class PriceData(BaseModel):
    current: float
    previous_close: float
    change: float
    change_percent: float
    high_52w: Optional[float] = None
    low_52w: Optional[float] = None
    time_range: str  # e.g., "1mo", "1y"


class OptionsSummary(BaseModel):
    call_volume: int
    put_volume: int
    call_open_interest: int
    put_open_interest: int
    put_call_ratio: float
    implied_volatility: float


class NewsHeadline(BaseModel):
    title: str
    sentiment: float
    published: str


class AnalyzerRequest(BaseModel):
    symbol: str
    indicators: List[str] = []  # "SMA", "EMA", "RSI", "BB"
    time_range: str = "1mo"  # Default to 1 month
    include_options: bool = True
    include_news: bool = True


class InsightItem(BaseModel):
    key: str
    value: str
    sentiment: str  # "positive", "negative", "neutral"
    explanation: str


class AnalyzerResponse(BaseModel):
    symbol: str
    analysis: str
    insights: List[InsightItem]
    timestamp: datetime


def calculate_technical_indicators(df, indicators):
    """Calculate the requested technical indicators"""
    results = []

    if "SMA" in indicators:
        # 20-day Simple Moving Average
        sma_period = 20
        if len(df) >= sma_period:
            df["SMA"] = df["Close"].rolling(window=sma_period).mean()
            latest_value = df["SMA"].iloc[-1]
            # Simple interpretation logic
            current_price = df["Close"].iloc[-1]
            if current_price > latest_value:
                interpretation = "bullish"
            elif current_price < latest_value:
                interpretation = "bearish"
            else:
                interpretation = "neutral"

            results.append(
                TechnicalIndicator(
                    name="SMA",
                    values=df["SMA"].dropna().tail(5).tolist(),
                    interpretation=interpretation,
                )
            )

    if "EMA" in indicators:
        # 12-day Exponential Moving Average
        ema_period = 12
        if len(df) >= ema_period:
            df["EMA"] = df["Close"].ewm(span=ema_period, adjust=False).mean()
            latest_value = df["EMA"].iloc[-1]
            # Simple interpretation logic
            current_price = df["Close"].iloc[-1]
            if current_price > latest_value:
                interpretation = "bullish"
            elif current_price < latest_value:
                interpretation = "bearish"
            else:
                interpretation = "neutral"

            results.append(
                TechnicalIndicator(
                    name="EMA",
                    values=df["EMA"].dropna().tail(5).tolist(),
                    interpretation=interpretation,
                )
            )

    if "RSI" in indicators:
        # 14-day Relative Strength Index
        rsi_period = 14
        if len(df) >= rsi_period + 1:
            delta = df["Close"].diff()
            gain = delta.where(delta > 0, 0).rolling(window=rsi_period).mean()
            loss = -delta.where(delta < 0, 0).rolling(window=rsi_period).mean()
            rs = gain / loss
            df["RSI"] = 100 - (100 / (1 + rs))
            latest_rsi = df["RSI"].iloc[-1]

            # RSI interpretation
            if latest_rsi > 70:
                interpretation = "overbought (bearish)"
            elif latest_rsi < 30:
                interpretation = "oversold (bullish)"
            else:
                interpretation = "neutral"

            results.append(
                TechnicalIndicator(
                    name="RSI",
                    values=df["RSI"].dropna().tail(5).tolist(),
                    interpretation=interpretation,
                )
            )

    if "BB" in indicators:
        # Bollinger Bands (20-day, 2 standard deviations)
        bb_period = 20
        if len(df) >= bb_period:
            df["SMA_BB"] = df["Close"].rolling(window=bb_period).mean()
            df["STD"] = df["Close"].rolling(window=bb_period).std()
            df["Upper_Band"] = df["SMA_BB"] + 2 * df["STD"]
            df["Lower_Band"] = df["SMA_BB"] - 2 * df["STD"]

            current_price = df["Close"].iloc[-1]
            upper_band = df["Upper_Band"].iloc[-1]
            lower_band = df["Lower_Band"].iloc[-1]

            # Bollinger Bands interpretation
            if current_price > upper_band:
                interpretation = "overbought (bearish)"
            elif current_price < lower_band:
                interpretation = "oversold (bullish)"
            else:
                # Calculate % position within bands
                band_width = upper_band - lower_band
                position = (current_price - lower_band) / band_width
                if position > 0.8:
                    interpretation = "approaching overbought"
                elif position < 0.2:
                    interpretation = "approaching oversold"
                else:
                    interpretation = "neutral"

            results.append(
                TechnicalIndicator(
                    name="BB",
                    values=[
                        df["Lower_Band"].iloc[-1],
                        df["SMA_BB"].iloc[-1],
                        df["Upper_Band"].iloc[-1],
                    ],
                    interpretation=interpretation,
                )
            )

    return results


def extract_options_summary(options_data: OptionsResponse) -> OptionsSummary:
    """Extract a summary of options data from the full options chain"""
    calls = options_data.calls
    puts = options_data.puts

    call_volume = sum(option.volume for option in calls) if calls else 0
    put_volume = sum(option.volume for option in puts) if puts else 0
    call_open_interest = sum(option.openInterest for option in calls) if calls else 0
    put_open_interest = sum(option.openInterest for option in puts) if puts else 0

    # Calculate put/call ratio (volume-based)
    put_call_ratio = put_volume / call_volume if call_volume > 0 else 0

    # Calculate average implied volatility
    call_iv = (
        sum(option.impliedVolatility for option in calls) / len(calls) if calls else 0
    )
    put_iv = sum(option.impliedVolatility for option in puts) / len(puts) if puts else 0
    avg_iv = (call_iv + put_iv) / 2 if (calls and puts) else (call_iv or put_iv)

    return OptionsSummary(
        call_volume=call_volume,
        put_volume=put_volume,
        call_open_interest=call_open_interest,
        put_open_interest=put_open_interest,
        put_call_ratio=put_call_ratio,
        implied_volatility=avg_iv,
    )


def format_price_data(ticker, time_range):
    """Format price data for the AI analysis"""
    ticker_info = yf.Ticker(ticker)
    history = ticker_info.history(period=time_range)

    if history.empty:
        raise ValueError(f"No price data available for {ticker}")

    current = history["Close"].iloc[-1]
    previous_close = history["Close"].iloc[-2] if len(history) > 1 else None
    change = current - previous_close if previous_close else 0
    change_percent = (change / previous_close * 100) if previous_close else 0

    # Get 52-week high and low
    history_1y = ticker_info.history(period="1y")
    high_52w = history_1y["High"].max() if not history_1y.empty else None
    low_52w = history_1y["Low"].min() if not history_1y.empty else None

    return PriceData(
        current=current,
        previous_close=previous_close,
        change=change,
        change_percent=change_percent,
        high_52w=high_52w,
        low_52w=low_52w,
        time_range=time_range,
    )


def format_news_headlines(news_articles: List[NewsArticle]) -> List[NewsHeadline]:
    """Format news headlines for the AI analysis"""
    return [
        NewsHeadline(
            title=article.title,
            sentiment=article.sentiment,
            published=article.published,
        )
        for article in news_articles
    ]


@analyzer_router.post("/analyze-stock", response_model=AnalyzerResponse)
async def analyze_stock(request: AnalyzerRequest):
    """
    Analyze a stock based on technical indicators, price data, options data, and news
    """
    try:
        symbol = request.symbol.upper()
        time_range = request.time_range
        indicators_list = request.indicators

        # 1. Get price data
        price_data = format_price_data(symbol, time_range)

        # 2. Calculate technical indicators if requested
        indicator_results = []
        if indicators_list:
            # Fetch historical data for technical analysis
            ticker_info = yf.Ticker(symbol)
            history = ticker_info.history(period=time_range)

            if not history.empty:
                indicator_results = calculate_technical_indicators(
                    history, indicators_list
                )

        # 3. Get options data if requested
        options_summary = None
        if request.include_options:
            try:
                from options.options_service import get_options_chain

                # Get latest options chain
                options_data = await get_options_chain(symbol)
                options_summary = extract_options_summary(options_data)
            except Exception as e:
                logger.warning(f"Failed to get options data for {symbol}: {e}")

        # 4. Get news data if requested
        news_headlines = []
        if request.include_news:
            try:
                from news.news_service import get_news_sentiment

                news_articles = await get_news_sentiment(symbol)
                news_headlines = format_news_headlines(news_articles)
            except Exception as e:
                logger.warning(f"Failed to get news for {symbol}: {e}")

        # 5. Format the data for the AI prompt
        prompt = f"""
        Analyze the following data for {symbol} and provide insights:
        
        PRICE DATA:
        Current Price: ${price_data.current:.2f}
        Previous Close: ${price_data.previous_close:.2f if price_data.previous_close else 'N/A'}
        Change: ${price_data.change:.2f} ({price_data.change_percent:.2f}%)
        52-Week High: ${price_data.high_52w:.2f if price_data.high_52w else 'N/A'}
        52-Week Low: ${price_data.low_52w:.2f if price_data.low_52w else 'N/A'}
        Time Range: {price_data.time_range}
        """

        if indicator_results:
            prompt += "\n\nTECHNICAL INDICATORS:"
            for indicator in indicator_results:
                values_str = ", ".join(
                    [
                        f"${v:.2f}" if isinstance(v, float) else str(v)
                        for v in indicator.values
                    ]
                )
                prompt += f"\n{indicator.name}: {values_str} - Interpretation: {indicator.interpretation}"

        if options_summary:
            prompt += f"""
            
            OPTIONS DATA:
            Call Volume: {options_summary.call_volume}
            Put Volume: {options_summary.put_volume}
            Call Open Interest: {options_summary.call_open_interest}
            Put Open Interest: {options_summary.put_open_interest}
            Put/Call Ratio: {options_summary.put_call_ratio:.2f}
            Implied Volatility: {options_summary.implied_volatility:.2f}
            """

        if news_headlines:
            prompt += "\n\nRECENT NEWS HEADLINES:"
            for i, headline in enumerate(news_headlines[:5]):  # Limit to 5 most recent
                sentiment_str = (
                    "positive"
                    if headline.sentiment > 0.2
                    else "negative"
                    if headline.sentiment < -0.2
                    else "neutral"
                )
                prompt += f"\n{i + 1}. {headline.title} ({sentiment_str}, {headline.published})"

        prompt += """
        
        Based on this information, provide:
        1. A comprehensive analysis (2-3 paragraphs)
        2. Key insights with clear sentiment indicators (positive/negative/neutral)
        
        Format your answer in a clear, concise manner that would be helpful for investors.
        """

        # 6. Send to OpenAI API
        response = openai_client.chat.completions.create(
            model="gpt-4.1-nano",  # Using a reliable model
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial analyst assistant that provides objective, data-driven stock analysis based on technical indicators, price data, options, and news.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,  # More factual responses
            max_tokens=1000,
        )

        # 7. Extract insights from the response
        analysis_text = response.choices[0].message.content

        # Parse insights using a follow-up call to make extraction more reliable
        extraction_prompt = f"""
        From the following stock analysis, extract 4-6 key insights in the format:
        KEY: short description
        SENTIMENT: positive, negative, or neutral
        EXPLANATION: brief explanation
        
        Analysis: {analysis_text}
        """

        extraction_response = openai_client.chat.completions.create(
            model="gpt-4.1-nano",  # Using a reliable model
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial data extraction assistant. Extract structured insights from stock analysis text.",
                },
                {"role": "user", "content": extraction_prompt},
            ],
            temperature=0.3,  # Very factual extraction
            max_tokens=800,
        )

        # Parse the extracted insights
        extraction_text = extraction_response.choices[0].message.content
        insight_items = []

        # Simple parsing of the extraction text
        current_insight = {}
        for line in extraction_text.strip().split("\n"):
            line = line.strip()
            if not line:
                continue

            if line.startswith("KEY:"):
                if (
                    current_insight
                    and "key" in current_insight
                    and "sentiment" in current_insight
                    and "explanation" in current_insight
                ):
                    insight_items.append(InsightItem(**current_insight))
                current_insight = {"key": line[4:].strip()}
            elif line.startswith("SENTIMENT:"):
                if current_insight:
                    current_insight["sentiment"] = line[10:].strip().lower()
            elif line.startswith("EXPLANATION:"):
                if current_insight:
                    current_insight["explanation"] = line[12:].strip()

        # Add the last insight if complete
        if (
            current_insight
            and "key" in current_insight
            and "sentiment" in current_insight
            and "explanation" in current_insight
        ):
            insight_items.append(InsightItem(**current_insight))

        # If we couldn't parse insights properly, create some generic ones based on price movement
        if not insight_items:
            if price_data.change > 0:
                insight_items.append(
                    InsightItem(
                        key="Price Movement",
                        value=f"${price_data.change:.2f} ({price_data.change_percent:.2f}%)",
                        sentiment="positive",
                        explanation=f"{symbol} has increased in value recently.",
                    )
                )
            else:
                insight_items.append(
                    InsightItem(
                        key="Price Movement",
                        value=f"${price_data.change:.2f} ({price_data.change_percent:.2f}%)",
                        sentiment="negative",
                        explanation=f"{symbol} has decreased in value recently.",
                    )
                )

        # 8. Return the analysis and insights
        return AnalyzerResponse(
            symbol=symbol,
            analysis=analysis_text,
            insights=insight_items,
            timestamp=datetime.now(),
        )

    except Exception as e:
        logger.error(f"Error analyzing stock {request.symbol}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Stock analysis failed: {str(e)}")

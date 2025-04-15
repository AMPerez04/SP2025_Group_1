from textblob import TextBlob
import yfinance as yf
from datetime import datetime, timezone
import pytz
from typing import List, Optional, Set
import re
import requests
from bs4 import BeautifulSoup
from fastapi import APIRouter, HTTPException, Query
import logging
from pydantic import BaseModel
from transformers import BertTokenizer, BertForSequenceClassification
import torch
import torch.nn.functional as F

# Load FinBERT tokenizer and model
MODEL_NAME = "ProsusAI/finbert"
tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
model = BertForSequenceClassification.from_pretrained(MODEL_NAME)

# Create a logger
logger = logging.getLogger(__name__)

# Create a router with appropriate prefix and tag
news_router = APIRouter(prefix="/news", tags=["news"])

# Known sites that block or limit scraping
NON_SCRAPPABLE_DOMAINS: Set[str] = {
    "bloomberg.com",
    "wsj.com",
    "ft.com",
    "barrons.com",
    "marketwatch.com",
    "fool.com",  # Sometimes allows, sometimes blocks
    "seekingalpha.com",
    "cnbc.com",  # Heavy JavaScript rendering
    "forbes.com",  # Anti-bot measures
    "reuters.com",  # Complex content loading
    "investing.com",  # Sometimes blocks scrapers
    "thestreet.com",  # Paywall
}


# Pydantic model for news articles
class NewsArticle(BaseModel):
    title: str
    publisher: str
    link: str
    published: str
    sentiment: float  # -1 to 1 scale
    sentiment_details: Optional[dict] = None  # Add this line to store raw FinBERT scores
    summary: Optional[str] = None
    content: Optional[str] = None
    imageUrl: Optional[str] = None
    is_scrappable: bool = False


def is_scrappable(url: str) -> bool:
    """
    Check if a URL is likely to be scrappable
    """
    try:
        # Extract domain from URL
        domain_match = re.search(r"https?://(?:www\.)?([^/]+)", url)
        if not domain_match:
            return False

        domain = domain_match.group(1)

        # Check against known non-scrappable domains
        for blocked_domain in NON_SCRAPPABLE_DOMAINS:
            if blocked_domain in domain:
                return False

        # Do a lightweight HEAD request to check for obvious blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        # Use HEAD request first (lighter than GET)
        response = requests.head(url, headers=headers, timeout=3)

        # Check for common blocking status codes
        if response.status_code in {403, 429, 503}:
            return False

        # Check for robot.txt directives (simplified)
        robots_url = f"https://{domain}/robots.txt"
        try:
            robots_response = requests.get(robots_url, timeout=2)
            if robots_response.ok and "Disallow: /" in robots_response.text:
                # Very basic check - ideally would use a proper robots.txt parser
                return False
        except Exception:
            # If we can't check robots.txt, proceed cautiously
            pass

        return True
    except Exception as e:
        logger.warning(f"Error checking scrappability for {url}: {e}")
        return False


def extract_article_content(url: str) -> Optional[str]:
    """
    Extract the main content from a news article URL
    """
    try:
        # Add headers to mimic a browser
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        response = requests.get(url, headers=headers, timeout=5)
        if not response.ok:
            return None

        soup = BeautifulSoup(response.text, "html.parser")

        # Remove script and style elements
        for script in soup(["script", "style", "header", "footer", "nav"]):
            script.extract()

        # Common article content selectors
        content_selectors = [
            "article",
            ".article-content",
            ".content",
            "main",
            "#content",
            ".article-body",
            ".story-body",
            ".post-content",
        ]

        for selector in content_selectors:
            content = soup.select_one(selector)
            if content:
                # Get all paragraphs
                paragraphs = content.find_all("p")
                if paragraphs:
                    text = " ".join([p.get_text().strip() for p in paragraphs])
                    # Clean up the text
                    text = re.sub(r"\s+", " ", text)
                    return text
        # Fallback: get all paragraphs from the page body
        paragraphs = soup.find_all("p")
        if paragraphs:
            text = " ".join([p.get_text().strip() for p in paragraphs])
            text = re.sub(r"\s+", " ", text)
            return text  # Limit to first 2000 chars

        return None
    except Exception as e:
        logger.warning(f"Error extracting content from {url}: {e}")
        return None


@news_router.get("/{ticker}", response_model=List[NewsArticle])
async def get_news_sentiment(
    ticker: str,
    try_scrape: bool = Query(
        False, description="Attempt to scrape full article content when possible"
    ),
):
    """
    Fetch news articles for a ticker with sentiment analysis

    Parameters:
    - ticker: Stock ticker symbol
    - try_scrape: If True, attempts to scrape full article content for sites that allow it
    """
    try:
        logger.info(f"Fetching news for {ticker}, try_scrape={try_scrape}")

        # Fetch news from Yahoo Finance
        stock = yf.Ticker(ticker)
        news_items = stock.news

        if not news_items:
            logger.info(f"No news found for ticker {ticker}")
            return []

        # Track scraping stats for logging
        scraping_stats = {"total": 0, "scrappable": 0, "successful": 0}

        articles = []
        for item in news_items[:10]:  # Limit to 10 articles for performance
            try:
                # Extract fields from Yahoo Finance data
                content = item.get("content", {})

                title = content.get("title", "")
                summary = content.get("summary", "")

                # Get publication info
                publisher = content.get("provider", {}).get("displayName", "Unknown")

                # Get the URL - check multiple possible locations
                url = None
                if "canonicalUrl" in content and "url" in content["canonicalUrl"]:
                    url = content["canonicalUrl"]["url"]
                elif "clickThroughUrl" in content:
                    url = content["clickThroughUrl"]
                else:
                    url = "#"

                # Format timestamp
                pub_date = content.get("pubDate")
                eastern_tz = pytz.timezone("America/New_York")

                if pub_date:
                    try:
                        # Parse ISO format date
                        dt = datetime.fromisoformat(pub_date.replace("Z", "+00:00"))
                        # Convert to Eastern Time
                        eastern_time = dt.astimezone(eastern_tz)
                        published_time = eastern_time.strftime("%Y-%m-%d %I:%M %p ET")
                    except (ValueError, TypeError):
                        # Fallback to timestamp if available
                        if content.get("pubTime", 0):
                            # Create datetime from timestamp (which is in UTC)
                            dt = datetime.fromtimestamp(
                                content.get("pubTime", 0), tz=timezone.utc
                            )
                            # Convert to Eastern Time
                            eastern_time = dt.astimezone(eastern_tz)
                            published_time = eastern_time.strftime(
                                "%Y-%m-%d %I:%M %p ET"
                            )
                        else:
                            published_time = "Unknown date"
                else:
                    # Fallback to timestamp
                    if content.get("pubTime", 0):
                        # Create datetime from timestamp (which is in UTC)
                        dt = datetime.fromtimestamp(
                            content.get("pubTime", 0), tz=timezone.utc
                        )
                        # Convert to Eastern Time
                        eastern_time = dt.astimezone(eastern_tz)
                        published_time = eastern_time.strftime("%Y-%m-%d %I:%M %p ET")
                    else:
                        published_time = "Unknown date"

                image_url = None
                if (
                    "thumbnail" in content
                    and content["thumbnail"]
                    and "resolutions" in content["thumbnail"]
                ):
                    resolutions = content["thumbnail"]["resolutions"]
                    # Get the highest resolution image
                    if resolutions and len(resolutions) > 0:
                        # Sort by width to get the largest image
                        sorted_images = sorted(
                            resolutions, key=lambda x: x.get("width", 0), reverse=True
                        )
                        if sorted_images:
                            image_url = sorted_images[0].get("url")

                # Do sentiment analysis on title and summary
                text_for_analysis = f"{title} {summary}"
                sentiment_scores = analyze_sentiment_finbert(text_for_analysis)
                sentiment = sentiment_scores["positive"] - sentiment_scores["negative"]


                # Initialize article with basic data
                article = NewsArticle(
                    title=title,
                    publisher=publisher,
                    link=url,
                    published=published_time,
                    sentiment=sentiment,
                    sentiment_details=sentiment_scores,
                    summary=summary,
                    content=None,
                    imageUrl=image_url,  # Add the image URL
                    is_scrappable=False,
                )

                # Check if we should try to scrape
                if try_scrape and url and url != "#":
                    scraping_stats["total"] += 1
                    article.is_scrappable = is_scrappable(url)

                    if article.is_scrappable:
                        scraping_stats["scrappable"] += 1
                        content_text = extract_article_content(url)

                        if content_text:
                            scraping_stats["successful"] += 1
                            article.content = content_text

                            # Update sentiment with full content if available
                            full_text = f"{title} {summary} {content_text}"
                            sentiment_scores = analyze_sentiment_finbert(full_text)
                            article.sentiment = sentiment_scores["positive"] - sentiment_scores["negative"]

                articles.append(article)
            except Exception as e:
                logger.warning(f"Error processing news item for {ticker}: {e}")
                # Continue with next article instead of failing completely
                continue

        # Sort by published date (newest first)
        articles.sort(key=lambda x: x.published, reverse=True)

        # Log scraping statistics
        if try_scrape:
            logger.info(
                f"Scraping stats for {ticker}: Total={scraping_stats['total']}, "
                f"Scrappable={scraping_stats['scrappable']}, "
                f"Successful={scraping_stats['successful']}"
            )

        return articles
    except Exception as e:
        logger.error(f"Error fetching news for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch news: {str(e)}")


def analyze_sentiment_finbert(text):
    """Analyze sentiment using FinBERT."""
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
    outputs = model(**inputs)
    probs = F.softmax(outputs.logits, dim=-1)  # Convert logits to probabilities

    sentiment_labels = ["negative", "neutral", "positive"]
    sentiment_scores = {sentiment_labels[i]: probs[0][i].item() for i in range(len(sentiment_labels))}

    return sentiment_scores

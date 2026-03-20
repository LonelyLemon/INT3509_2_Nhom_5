import json

from datetime import datetime, timedelta

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.news.utils import _make_api_request, format_datetime_for_api
from src.news.models import NewsArticle, NewsArticleTicker, NewsArticleTopic


# ── Alpha Vantage fetch helpers ──

def get_news(ticker: str, start_date, end_date, limit: int = 5) -> str:
    """Fetch news from Alpha Vantage for a specific ticker."""
    params = {
        "tickers": ticker,
        "time_from": format_datetime_for_api(start_date),
        "time_to": format_datetime_for_api(end_date),
        "sort": "LATEST",
        "limit": limit,
    }
    return _make_api_request("NEWS_SENTIMENT", params)


def get_global_news(curr_date, look_back_days: int = 7, limit: int = 5) -> str:
    """Fetch global market news from Alpha Vantage."""
    curr_dt = datetime.strptime(curr_date, "%Y-%m-%d")
    start_dt = curr_dt - timedelta(days=look_back_days)
    start_date = start_dt.strftime("%Y-%m-%d")

    params = {
        "topics": "financial_markets,economy_macro,economy_monetary",
        "time_from": format_datetime_for_api(start_date),
        "time_to": format_datetime_for_api(curr_date),
        "limit": str(limit),
    }
    return _make_api_request("NEWS_SENTIMENT", params)


# ── Parsing ──

def _parse_published_time(time_str: str) -> datetime:
    """Parse Alpha Vantage time format '20260318T081300' into a datetime."""
    return datetime.strptime(time_str, "%Y%m%dT%H%M%S")


def _find_primary_topic(topics: list[dict]) -> str | None:
    """Return the topic with the highest relevance_score."""
    if not topics:
        return None
    best = max(topics, key=lambda t: float(t.get("relevance_score", 0)))
    return best.get("topic")


def _find_primary_ticker(ticker_sentiments: list[dict]) -> str | None:
    """Return the ticker with the highest relevance_score."""
    if not ticker_sentiments:
        return None
    best = max(ticker_sentiments, key=lambda t: float(t.get("relevance_score", 0)))
    return best.get("ticker")


def parse_alpha_vantage_response(raw_json: str) -> list[dict]:
    """Parse fetched Alpha Vantage JSON into a list of article dicts
    ready for database insertion.

    Each dict contains flat article fields plus 'tickers' and 'topics' lists.
    """
    data = json.loads(raw_json)
    feed = data.get("feed", [])

    articles = []
    for item in feed:
        topics_raw = item.get("topics", [])
        tickers_raw = item.get("ticker_sentiment", [])

        article = {
            "title": item.get("title", ""),
            "summary": item.get("summary", ""),
            "published_at": _parse_published_time(item["time_published"]),
            "authors": item.get("authors", []),
            "url": item.get("url", ""),
            "source": item.get("source", ""),
            "source_domain": item.get("source_domain", ""),
            "primary_topic": _find_primary_topic(topics_raw),
            "primary_ticker": _find_primary_ticker(tickers_raw),
            "overall_sentiment_score": item.get("overall_sentiment_score"),
            "overall_sentiment_label": item.get("overall_sentiment_label"),
            "tickers": [
                {
                    "ticker": t["ticker"],
                    "relevance_score": float(t.get("relevance_score", 0)),
                    "sentiment_score": float(t.get("ticker_sentiment_score", 0)),
                }
                for t in tickers_raw
            ],
            "topics": [
                {
                    "topic": t["topic"],
                    "relevance_score": float(t.get("relevance_score", 0)),
                }
                for t in topics_raw
            ],
        }
        articles.append(article)

    return articles


# ── Database persistence ──

async def save_news_articles(db: AsyncSession, articles: list[dict]) -> list[NewsArticle]:
    """Upsert parsed articles into the database.
    
    Skips articles whose URL already exists (deduplication).
    Returns the list of newly inserted NewsArticle objects.
    """
    saved: list[NewsArticle] = []

    for article_data in articles:
        # Check for duplicate by URL
        result = await db.execute(
            select(NewsArticle).where(NewsArticle.url == article_data["url"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            logger.debug(f"Skipping duplicate article: {article_data['url']}")
            continue

        tickers_data = article_data.pop("tickers")
        topics_data = article_data.pop("topics")

        news_article = NewsArticle(**article_data)
        db.add(news_article)
        await db.flush()  # Get the article ID

        for t in tickers_data:
            ticker_obj = NewsArticleTicker(article_id=news_article.id, **t)
            db.add(ticker_obj)

        for t in topics_data:
            topic_obj = NewsArticleTopic(article_id=news_article.id, **t)
            db.add(topic_obj)

        saved.append(news_article)

    await db.commit()

    # Refresh to load relationships
    for article in saved:
        await db.refresh(article)

    return saved


async def fetch_and_store_news(
    db: AsyncSession,
    ticker: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 10,
) -> list[NewsArticle]:
    """Fetch news from Alpha Vantage, parse, and store in the database.
    
    If ticker is provided, fetches ticker-specific news.
    Otherwise fetches global market news.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    
    if ticker:
        _start = start_date or (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        _end = end_date or today
        raw = get_news(ticker, _start, _end, limit=limit)
    else:
        raw = get_global_news(end_date or today, look_back_days=7, limit=limit)

    articles = parse_alpha_vantage_response(raw)
    logger.info(f"Fetched {len(articles)} articles from Alpha Vantage")

    saved = await save_news_articles(db, articles)
    logger.info(f"Saved {len(saved)} new articles to database")

    return saved

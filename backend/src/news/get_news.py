from datetime import datetime, timezone, timedelta

from src.news.utils import _make_api_request, format_datetime_for_api
from src.news.models import NewsArticle, NewsArticleTicker, NewsArticleTopic

# ── Alpha Vantage fetch helpers ──

def get_news(ticker: str, start_date, end_date, limit: int = 5) -> dict | str:
    """Fetch news from Alpha Vantage for a specific ticker."""
    params = {
        "tickers": ticker,
        "time_from": format_datetime_for_api(start_date),
        "time_to": format_datetime_for_api(end_date),
        "sort": "LATEST",
        "limit": limit,
    }
    return _make_api_request("NEWS_SENTIMENT", params)


def get_global_news(curr_date: datetime, look_back_days: int = 7, limit: int = 5) -> dict | str:
    """Fetch global market news from Alpha Vantage."""
    start_dt = curr_date - timedelta(days=look_back_days)

    params = {
        "topics": "financial_markets,economy_macro,economy_monetary",
        "time_from": format_datetime_for_api(start_dt),
        "time_to": format_datetime_for_api(curr_date),
        "limit": str(limit),
    }
    return _make_api_request("NEWS_SENTIMENT", params)

# ──  Parsing ──

def _parse_published_time(time_str: str) -> datetime:
    """Parse Alpha Vantage time format '20260318T081300' into a datetime."""
    return datetime.strptime(time_str, "%Y%m%dT%H%M%S").replace(tzinfo=timezone.utc)


def parse_article_json(article_data: dict) -> NewsArticle:
    """
    Parses a single article JSON item from Alpha Vantage into a NewsArticle SQLAlchemy model.
    """
    # 1. Parse published time using the helpers
    published_time_str = article_data.get("time_published")
    published_at = _parse_published_time(published_time_str) if published_time_str else None

    # 2. Process topics and determine the primary topic
    topics_list = []
    primary_topic = None
    max_topic_relevance = -1.0

    for t_data in article_data.get("topics", []):
        relevance = float(t_data.get("relevance_score", 0.0))
        topic_name = t_data.get("topic")

        topics_list.append(NewsArticleTopic(
            topic=topic_name,
            relevance_score=relevance
        ))

        if relevance > max_topic_relevance:
            max_topic_relevance = relevance
            primary_topic = topic_name
        
    # 3. Process tickers and determine the primary ticker
    tickers_list = []
    primary_ticker = None
    max_ticker_relevance = -1.0

    for t_data in article_data.get("ticker_sentiment", []):
        relevance = float(t_data.get("relevance_score", 0.0))
        sentiment = float(t_data.get("ticker_sentiment_score", 0.0))
        ticker_name = t_data.get("ticker")

        tickers_list.append(NewsArticleTicker(
            ticker=ticker_name,
            relevance_score=relevance,
            sentiment_score=sentiment
        ))

        if relevance > max_ticker_relevance:
            max_ticker_relevance = relevance
            primary_ticker = ticker_name
    
    # 4. Construct the main NewsArticle model
    title = article_data.get("title", "")[:512]
    url = article_data.get("url", "")[:1024]

    article = NewsArticle(
        title=title,
        summary=article_data.get("summary", ""),
        published_at=published_at,
        authors=article_data.get("authors", []),
        url=url,
        source=article_data.get("source"),
        source_domain=article_data.get("source_domain"),
        primary_topic=primary_topic,
        primary_ticker=primary_ticker,
        overall_sentiment_score=article_data.get("overall_sentiment_score"),
        overall_sentiment_label=article_data.get("overall_sentiment_label"),
        tickers=tickers_list,
        topics=topics_list,
    )

    return article
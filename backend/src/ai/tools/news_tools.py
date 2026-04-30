from datetime import datetime, timezone, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.news.models import NewsArticle, NewsArticleTicker


async def get_news_for_ticker(
    db: AsyncSession,
    ticker: str,
    days_back: int = 7,
    limit: int = 10,
) -> dict:
    """
    Fetch recent news articles related to a ticker.
    Returns up to `limit` articles from the past `days_back` days.
    """
    ticker = ticker.upper()
    since = datetime.now(timezone.utc) - timedelta(days=days_back)

    rows = (
        await db.execute(
            select(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(
                NewsArticleTicker.ticker == ticker,
                NewsArticle.published_at >= since,
            )
            .order_by(NewsArticle.published_at.desc())
            .limit(limit)
            .distinct()
        )
    ).scalars().all()

    if not rows:
        return {
            "ticker": ticker,
            "articles": [],
            "message": f"No recent news found for '{ticker}' in the past {days_back} days.",
        }

    articles = [
        {
            "title": a.title,
            "summary": a.summary or "",
            "published_at": a.published_at.isoformat(),
            "source": a.source or a.source_domain or "Unknown",
            "url": a.url,
        }
        for a in rows
    ]

    return {
        "ticker": ticker,
        "days_back": days_back,
        "articles": articles,
        "count": len(articles),
    }

import asyncio

from loguru import logger
from sqlalchemy import select

from src.core.celery import celery_app
from src.core.database import TaskSessionLocal
from src.news.get_news import get_tickers_news, parse_yfinance_news_item
from src.news.models import NewsArticle
from src.price.models import Asset

# How many news items to request per ticker per run.
NEWS_PER_TICKER = 10


@celery_app.task(name="src.news.tasks.ingest_assets_news")
def ingest_assets_news():
    """
    Celery task: fetch recent news for every active asset in the database
    and persist only articles not already stored (URL-deduplicated).

    Scheduled via Celery Beat — do NOT start APScheduler alongside this.
    """
    asyncio.run(_ingest_assets_news())


async def _ingest_assets_news():
    async with TaskSessionLocal() as db:
        # 1. Resolve active tickers from DB.
        result = await db.execute(select(Asset.ticker).where(Asset.is_active == True))
        tickers = result.scalars().all()
        if not tickers:
            logger.info("No active assets — skipping news ingestion.")
            return

        logger.info(f"Fetching news for {len(tickers)} active assets…")

        # 2. Collect raw items from yfinance (includes cross-ticker dedup by URL).
        #    This is blocking I/O (HTTP), so run it in a thread.
        raw_pairs: list[tuple[str, dict]] = await asyncio.to_thread(
            get_tickers_news, list(tickers), NEWS_PER_TICKER
        )

        if not raw_pairs:
            logger.info("No news items returned from yfinance.")
            return

        # 3. Bulk-check which URLs are already in the DB — one query, not N.
        candidate_urls = [url for _, item in raw_pairs if (url := _url(item))]
        existing_result = await db.execute(
            select(NewsArticle.url).where(NewsArticle.url.in_(candidate_urls))
        )
        existing_urls: set[str] = set(existing_result.scalars().all())

        # 4. Parse and collect only truly new articles.
        new_articles: list[NewsArticle] = []
        for source_ticker, item in raw_pairs:
            url = _url(item)
            if not url or url in existing_urls:
                continue
            article = parse_yfinance_news_item(item, source_ticker)
            if article:
                new_articles.append(article)
                existing_urls.add(url)  # prevent intra-batch duplicates

        if not new_articles:
            logger.info("All fetched articles already exist in the database.")
            return

        db.add_all(new_articles)
        await db.commit()
        logger.info(
            f"Saved {len(new_articles)} new articles "
            f"(from {len(raw_pairs)} fetched across {len(tickers)} tickers)."
        )


def _url(item: dict) -> str | None:
    """Inline URL extractor — avoids importing the private helper."""
    content = item.get("content", {})
    if content:
        canonical = content.get("canonicalUrl") or {}
        return canonical.get("url") or content.get("url") or item.get("link")
    return item.get("link")

import json
import asyncio
import logging

from datetime import timedelta
from sqlalchemy import select

from src.core.database import SessionLocal
from src.utils.datetime_util import time_now
from src.news.models import NewsArticle
from src.news.get_news import (
    get_news as fetch_ticker_news, 
    get_global_news as fetch_global_news, 
    parse_article_json
)

logger = logging.getLogger(__name__)

async def process_and_save_news(raw_response, limit: int):
    if isinstance(raw_response, str):
        try:
            json.loads(raw_response)
        except json.JSONDecodeError:
            logger.error("Invalid JSON received from Alpha Vantage in scheduled task.")
            return
    else:
        data = raw_response

    feed = data.get("feed", [])[:limit]
    if not feed:
        return
    
    async with SessionLocal() as db:
        incoming_urls = [article.get("url") for article in feed if article.get("url")]
        existing_records = await db.execute(
            select(NewsArticle.url).where(NewsArticle.url.in_(incoming_urls))
        )
        existing_urls = set(existing_records.scalars().all())

        new_articles = []
        for item in feed:
            url = item.get("url")
            if url and url not in existing_urls:
                article_model = parse_article_json(item)
                new_articles.append(article_model)
                existing_urls.add(url)
                
        if new_articles:
            db.add_all(new_articles)
            await db.commit()
            logger.info(f"Scheduler saved {len(new_articles)} new articles.")
    
async def scheduled_fetch_global_news():
    """Task to fetch global market news."""
    logger.info("Running scheduled global news fetch...")
    now = time_now()
    limit = 50
    look_back_days = 7
    
    raw_response = await asyncio.to_thread(
        fetch_global_news, now, look_back_days, limit
    )
    await process_and_save_news(raw_response, limit)


async def scheduled_fetch_ticker_news(ticker: str):
    """Task to fetch news for a specific ticker."""
    logger.info(f"Running scheduled ticker news fetch for {ticker}...")
    now = time_now()
    limit = 50
    look_back_days = 7
    start_date = now - timedelta(days=look_back_days)
    
    raw_response = await asyncio.to_thread(
        fetch_ticker_news, ticker, start_date, now, limit
    )
    await process_and_save_news(raw_response, limit)
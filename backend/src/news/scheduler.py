from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from loguru import logger

from src.core.database import SessionLocal
from src.news.get_news import fetch_and_store_news
from src.news.utils import AlphaVantageRateLimitError


scheduler = AsyncIOScheduler()


async def scheduled_fetch_global_news():
    """Background job: fetch global market news and store to DB."""
    logger.info("Scheduled news fetch started")
    try:
        async with SessionLocal() as db:
            saved = await fetch_and_store_news(db, limit=10)
            logger.info(f"Scheduled fetch complete — {len(saved)} new articles saved")
    except AlphaVantageRateLimitError:
        logger.warning("Alpha Vantage rate limit hit during scheduled fetch — skipping")
    except Exception as e:
        logger.error(f"Scheduled news fetch failed: {e}")


def start_scheduler():
    """Start the APScheduler with a cron job that fetches news every day."""
    scheduler.add_job(
        scheduled_fetch_global_news,
        trigger=CronTrigger(hour=0, minute=0),  # Every day at 00:00
        id="fetch_global_news",
        name="Fetch global market news",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("News scheduler started — fetching every day")


def stop_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("News scheduler stopped")

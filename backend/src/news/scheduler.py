from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

from src.news.tasks import scheduled_fetch_global_news, scheduled_fetch_ticker_news

# Initialize the async scheduler
scheduler = AsyncIOScheduler()

def setup_scheduler():
    # 1. Global News: Every 3 hours (8 requests/day)
    scheduler.add_job(
        scheduled_fetch_global_news,
        trigger=IntervalTrigger(hours=3),
        id="global_news_job",
        replace_existing=True
    )
    
    # 2. Targeted Tickers: Track specific high-value targets (Example: AAPL, TSLA)
    # Using America/New_York ensures we hit exactly 9:30 AM and 4:00 PM Eastern Time
    tickers_to_track = ["AAPL", "TSLA"] 
    
    for ticker in tickers_to_track:
        # Market Open trigger (9:30 AM EST)
        scheduler.add_job(
            scheduled_fetch_ticker_news,
            trigger=CronTrigger(hour=9, minute=30, timezone="America/New_York"),
            args=[ticker],
            id=f"{ticker}_market_open_job",
            replace_existing=True
        )
        
        # Market Close trigger (4:00 PM EST)
        scheduler.add_job(
            scheduled_fetch_ticker_news,
            trigger=CronTrigger(hour=16, minute=0, timezone="America/New_York"),
            args=[ticker],
            id=f"{ticker}_market_close_job",
            replace_existing=True
        )

    scheduler.start()
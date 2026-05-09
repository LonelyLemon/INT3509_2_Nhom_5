from celery import Celery
from celery.schedules import crontab

from src.core.config import settings

celery_app = Celery(
    "marketmind",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.price.tasks",
        "src.news.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Ho_Chi_Minh",
    enable_utc=True,
)

# ---------------------------------------------------------------------------
# Beat schedule
# All times below are expressed in the configured timezone (Asia/Ho_Chi_Minh,
# UTC+7). NYSE open/close equivalents in HCM time (summer / EDT = UTC-4):
#   09:30 ET  →  20:30 HCM
#   16:00 ET  →  03:00 HCM (+1 day)
# ---------------------------------------------------------------------------
celery_app.conf.beat_schedule = {
    # ── Price (1m) ──
    "fetch-1m-price-data": {
        "task": "src.price.tasks.ingest_1m_price_data",
        "schedule": crontab(minute="*"),  # every minute
    },

    # ── Price (historical refresh) ──
    # Refreshes daily and hourly candles once per day at 06:00 HCM.
    # This keeps 1h/1d timeframes up-to-date without re-running the full
    # manual backfill.  Uses on_conflict_do_nothing so it's always safe.
    "refresh-historical-price-data": {
        "task": "src.price.tasks.ingest_historical_price_data",
        "schedule": crontab(hour=6, minute=0),  # 06:00 HCM = 23:00 UTC prev day
    },

    # ── News ──
    # Periodic background refresh every 3 hours to stay within Yahoo rate limits.
    "fetch-assets-news-periodic": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(minute=0, hour="*/3"),
    },
    # Extra run at NYSE open (≈ 20:30 HCM, summer / EDT).
    "fetch-assets-news-market-open": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(hour=20, minute=30),
    },
    # Extra run at NYSE close (≈ 03:00 HCM next day, summer / EDT).
    "fetch-assets-news-market-close": {
        "task": "src.news.tasks.ingest_assets_news",
        "schedule": crontab(hour=3, minute=0),
    },
}

import asyncio
from uuid import UUID

from fastapi import APIRouter, Query
from sqlalchemy import select, func

from src.core.database import SessionDep
from src.news.models import NewsArticle
from src.news.schemas import NewsArticleResponse, NewsArticleListResponse
from src.news.get_news import get_ticker_news, parse_yfinance_news_item
from src.news.exceptions import ArticleNotFound, NewsProviderError

news_route = APIRouter(
    prefix="/news",
    tags=["News"],
)


# ── Manual fetch (on-demand) ────────────────────────────────────────────────

@news_route.post("/fetch")
async def fetch_and_save_news(
    db: SessionDep,
    ticker: str | None = Query(
        None,
        description=(
            "Ticker to fetch news for. "
            "If omitted, the background Celery task is dispatched instead."
        ),
    ),
    limit: int = Query(20, ge=1, le=50, description="Max articles to fetch per ticker"),
):
    """
    Fetch and persist news for a single ticker on demand.

    - **ticker** provided → fetch immediately via yfinance and return results.
    - **ticker** omitted → dispatch the `ingest_assets_news` Celery task for
      all active DB assets and return a 202-style acknowledgement.
    """
    if not ticker:
        # Defer to the Celery task so the HTTP request returns fast.
        from src.news.tasks import ingest_assets_news
        ingest_assets_news.delay()
        return {
            "message": "News ingestion task dispatched for all active assets.",
            "status": "queued",
        }

    # Fetch news for the requested ticker in a thread (blocking I/O).
    raw_items: list[dict] = await asyncio.to_thread(get_ticker_news, ticker, limit)

    if not raw_items:
        return {"message": "No news found for ticker.", "fetched_count": 0, "inserted_count": 0}

    # Deduplicate against existing DB records (single query).
    candidate_urls = [u for item in raw_items if (u := _url(item))]
    existing_result = await db.execute(
        select(NewsArticle.url).where(NewsArticle.url.in_(candidate_urls))
    )
    existing_urls: set[str] = set(existing_result.scalars().all())

    new_articles: list[NewsArticle] = []
    for item in raw_items:
        url = _url(item)
        if not url or url in existing_urls:
            continue
        article = parse_yfinance_news_item(item, ticker)
        if article:
            new_articles.append(article)
            existing_urls.add(url)

    if new_articles:
        db.add_all(new_articles)
        await db.commit()

    return {
        "message": "Successfully fetched and saved news.",
        "fetched_count": len(raw_items),
        "inserted_count": len(new_articles),
    }


# ── List ────────────────────────────────────────────────────────────────────

@news_route.get("", response_model=NewsArticleListResponse)
async def get_news_list(
    db: SessionDep,
    ticker: str | None = Query(None, description="Filter articles by ticker symbol."),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    if ticker:
        # Join through NewsArticleTicker for efficient index-backed filtering.
        from src.news.models import NewsArticleTicker
        base = (
            select(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(NewsArticleTicker.ticker == ticker)
            .order_by(NewsArticle.published_at.desc())
        )
        count_base = (
            select(func.count())
            .select_from(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(NewsArticleTicker.ticker == ticker)
        )
    else:
        base = select(NewsArticle).order_by(NewsArticle.published_at.desc())
        count_base = select(func.count()).select_from(NewsArticle)

    items_result = await db.execute(base.offset(skip).limit(limit))
    items = items_result.scalars().all()

    total_result = await db.execute(count_base)
    total = total_result.scalar_one()

    return NewsArticleListResponse(items=items, total=total)


# ── Single article ───────────────────────────────────────────────────────────

@news_route.get("/{news_id}", response_model=NewsArticleResponse)
async def get_specific_news(db: SessionDep, news_id: UUID):
    result = await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    article = result.scalar_one_or_none()
    if not article:
        raise ArticleNotFound()
    return article


# ── Helpers ─────────────────────────────────────────────────────────────────

def _url(item: dict) -> str | None:
    content = item.get("content", {})
    if content:
        canonical = content.get("canonicalUrl") or {}
        return canonical.get("url") or content.get("url") or item.get("link")
    return item.get("link")

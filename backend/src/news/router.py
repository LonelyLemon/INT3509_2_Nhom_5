import asyncio
from datetime import datetime
from enum import Enum
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, delete as sa_delete

from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.auth.exceptions import InsufficientPermissions
from src.core.database import SessionDep
from src.news.models import NewsArticle, NewsArticleTicker
from src.news.schemas import (
    NewsArticleResponse,
    NewsArticleListResponse,
    NewsArticleCreate,
    NewsArticleUpdate,
)
from src.news.get_news import get_ticker_news, parse_yfinance_news_item
from src.news.exceptions import ArticleNotFound, ArticleAlreadyExists, InvalidNewsQuery, NewsProviderError

news_route = APIRouter(
    prefix="/news",
    tags=["News"],
)


class SortBy(str, Enum):
    published_at = "published_at"
    created_at = "created_at"


class SortOrder(str, Enum):
    asc = "asc"
    desc = "desc"


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
        from src.news.tasks import ingest_assets_news
        ingest_assets_news.delay()
        return {
            "message": "News ingestion task dispatched for all active assets.",
            "status": "queued",
        }

    raw_items: list[dict] = await asyncio.to_thread(get_ticker_news, ticker, limit)

    if not raw_items:
        return {"message": "No news found for ticker.", "fetched_count": 0, "inserted_count": 0}

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
    from_date: datetime | None = Query(None, description="Filter articles published on or after this datetime (ISO 8601 UTC)."),
    to_date: datetime | None = Query(None, description="Filter articles published on or before this datetime (ISO 8601 UTC)."),
    source: str | None = Query(None, description="Filter by source domain (partial match)."),
    sort_by: SortBy = Query(SortBy.published_at, description="Field to sort results by."),
    order: SortOrder = Query(SortOrder.desc, description="Sort direction."),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    if from_date and to_date and from_date > to_date:
        raise InvalidNewsQuery("from_date must be before to_date.")

    if ticker:
        base = (
            select(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(NewsArticleTicker.ticker == ticker.upper())
            .distinct()
        )
        count_base = (
            select(func.count(NewsArticle.id.distinct()))
            .select_from(NewsArticle)
            .join(NewsArticleTicker, NewsArticleTicker.article_id == NewsArticle.id)
            .where(NewsArticleTicker.ticker == ticker.upper())
        )
    else:
        base = select(NewsArticle)
        count_base = select(func.count()).select_from(NewsArticle)

    if from_date:
        base = base.where(NewsArticle.published_at >= from_date)
        count_base = count_base.where(NewsArticle.published_at >= from_date)
    if to_date:
        base = base.where(NewsArticle.published_at <= to_date)
        count_base = count_base.where(NewsArticle.published_at <= to_date)
    if source:
        base = base.where(NewsArticle.source_domain.ilike(f"%{source}%"))
        count_base = count_base.where(NewsArticle.source_domain.ilike(f"%{source}%"))

    sort_col = getattr(NewsArticle, sort_by.value)
    base = base.order_by(sort_col.asc() if order == SortOrder.asc else sort_col.desc())

    items_result = await db.execute(base.offset(skip).limit(limit))
    items = items_result.scalars().all()

    total_result = await db.execute(count_base)
    total = total_result.scalar_one()

    return NewsArticleListResponse(items=items, total=total, skip=skip, limit=limit)


# ── Single article ───────────────────────────────────────────────────────────

@news_route.get("/{news_id}", response_model=NewsArticleResponse)
async def get_specific_news(db: SessionDep, news_id: UUID):
    result = await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    article = result.scalar_one_or_none()
    if not article:
        raise ArticleNotFound()
    return article


# ── Admin: create ────────────────────────────────────────────────────────────

@news_route.post("", response_model=NewsArticleResponse, status_code=201)
async def create_news_article(
    payload: NewsArticleCreate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Manually create a news article. Admin only."""
    if current_user.role != "admin":
        raise InsufficientPermissions()

    existing = await db.execute(select(NewsArticle).where(NewsArticle.url == payload.url))
    if existing.scalar_one_or_none():
        raise ArticleAlreadyExists()

    ticker_rows = [
        NewsArticleTicker(ticker=t.upper(), relevance_score=None)
        for t in payload.tickers
    ]

    article = NewsArticle(
        title=payload.title,
        summary=payload.summary,
        published_at=payload.published_at,
        authors=payload.authors,
        url=payload.url,
        source=payload.source,
        source_domain=payload.source_domain,
        tickers=ticker_rows,
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    return article


# ── Admin: update ────────────────────────────────────────────────────────────

@news_route.put("/{news_id}", response_model=NewsArticleResponse)
async def update_news_article(
    news_id: UUID,
    payload: NewsArticleUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Partially update a news article. Admin only."""
    if current_user.role != "admin":
        raise InsufficientPermissions()

    result = await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    article = result.scalar_one_or_none()
    if not article:
        raise ArticleNotFound()

    update_data = payload.model_dump(exclude_unset=True, exclude={"tickers"})
    for key, value in update_data.items():
        setattr(article, key, value)

    if payload.tickers is not None:
        await db.execute(
            sa_delete(NewsArticleTicker).where(NewsArticleTicker.article_id == article.id)
        )
        for ticker_symbol in payload.tickers:
            db.add(NewsArticleTicker(
                article_id=article.id,
                ticker=ticker_symbol.upper(),
                relevance_score=None,
            ))

    await db.commit()
    await db.refresh(article)
    return article


# ── Admin: delete ────────────────────────────────────────────────────────────

@news_route.delete("/{news_id}", status_code=204)
async def delete_news_article(
    news_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """Delete a news article. Admin only."""
    if current_user.role != "admin":
        raise InsufficientPermissions()

    result = await db.execute(select(NewsArticle).where(NewsArticle.id == news_id))
    article = result.scalar_one_or_none()
    if not article:
        raise ArticleNotFound()

    await db.delete(article)
    await db.commit()


# ── Helpers ─────────────────────────────────────────────────────────────────

def _url(item: dict) -> str | None:
    content = item.get("content", {})
    if content:
        canonical = content.get("canonicalUrl") or {}
        return canonical.get("url") or content.get("url") or item.get("link")
    return item.get("link")

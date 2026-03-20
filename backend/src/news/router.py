from uuid import UUID

from loguru import logger
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from fastapi import APIRouter, Query

from src.core.database import SessionDep
from src.news.models import NewsArticle
from src.news.schemas import NewsArticleResponse, NewsArticleListResponse
from src.news.exceptions import NewsArticleNotFound, NewsFetchError
from src.news.get_news import fetch_and_store_news
from src.news.utils import AlphaVantageRateLimitError


news_route = APIRouter(
    prefix="/news",
    tags=["News"],
)


# ──────────────────────────
#   LIST NEWS ARTICLES
# ──────────────────────────
@news_route.get("", response_model=NewsArticleListResponse)
async def list_news_articles(db: SessionDep, 
                            skip: int = Query(0, ge=0, description="Number of records to skip"),
                            limit: int = Query(20, ge=1, le=100, description="Max records to return"),
                            ticker: str | None = Query(None, description="Filter by primary ticker"),
                            ):
    """List news articles with optional ticker filter and pagination."""
    query = select(NewsArticle)

    if ticker:
        query = query.where(NewsArticle.primary_ticker == ticker.upper())

    # Total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    # Paginated results ordered by published_at descending
    query = (
        query
        .options(selectinload(NewsArticle.tickers), selectinload(NewsArticle.topics))
        .order_by(NewsArticle.published_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    articles = result.scalars().all()

    return NewsArticleListResponse(items=articles, total=total)


# ───────────────────────────────
#   FETCH NEWS ARTICLES (DEV ONLY)
# ───────────────────────────────
@news_route.get("/fetch", response_model=NewsArticleListResponse)
async def fetch_news_articles(db: SessionDep,
                              ticker: str | None = Query(None, description="Ticker to fetch news for"),
                              limit: int = Query(10, ge=1, le=50, description="Max articles to fetch"),
                              ):
    """
    Fetch news articles from Alpha Vantage and save to database.

    This endpoint is for **development use only** — it lets you manually
    trigger a news fetch without waiting for the scheduler.
    """
    try:
        saved = await fetch_and_store_news(db, ticker=ticker, limit=limit)
        logger.info(f"Dev fetch complete — {len(saved)} new articles saved")
        return NewsArticleListResponse(items=saved, total=len(saved))
    except AlphaVantageRateLimitError as e:
        raise NewsFetchError(detail=str(e))
    except Exception as e:
        logger.error(f"Dev fetch failed: {e}")
        raise NewsFetchError(detail=f"Failed to fetch news: {e}")


# ──────────────────────────
#   GET SINGLE ARTICLE
# ──────────────────────────
@news_route.get("/{article_id}", response_model=NewsArticleResponse)
async def get_news_article(article_id: UUID, db: SessionDep):
    """Retrieve a single news article by its ID."""
    query = (
        select(NewsArticle)
        .options(selectinload(NewsArticle.tickers), selectinload(NewsArticle.topics))
        .where(NewsArticle.id == article_id)
    )
    result = await db.execute(query)
    article = result.scalar_one_or_none()

    if not article:
        raise NewsArticleNotFound()

    return article
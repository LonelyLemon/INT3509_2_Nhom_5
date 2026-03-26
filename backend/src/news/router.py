import json
import asyncio

from uuid import UUID
from datetime import timedelta

from fastapi import APIRouter, Query
from sqlalchemy import select, func

from src.core.database import SessionDep
from src.utils.datetime_util import time_now
from src.news.models import NewsArticle
from src.news.schemas import NewsArticleResponse, NewsArticleListResponse
from src.news.get_news import (
    get_news as fetch_ticker_news, 
    get_global_news as fetch_global_news, 
    parse_article_json
)
from src.news.exceptions import InvalidJSONPayload, ArticleNotFound


news_route = APIRouter(
    prefix="/news",
    tags=["News"]
)

#----------------------
#      FETCH NEWS
#----------------------

@news_route.post("/fetch")
async def fetch_and_save_news(db: SessionDep,
                              ticker: str | None = Query(None, description="Specific ticker to fetch news for. If omitted, fetches global news."),
                              look_back_days: int | None = Query(7, description="Days to look back for global news"),
                              limit: int = Query(100, description="Number of article to fetch")):
    now = time_now()

    if ticker:
        start_date = now - timedelta(days=look_back_days)
        raw_response = await asyncio.to_thread(
            fetch_ticker_news, ticker, start_date, now, limit
        )
    else:
        raw_response = await asyncio.to_thread(
            fetch_global_news, now, look_back_days, limit
        )
    
    if isinstance(raw_response, str):
        try:
            data = json.loads(raw_response)
        except json.JSONDecodeError:
            raise InvalidJSONPayload()
    else:
        data = raw_response

    feed = data.get("feed", [])[:limit]
    if not feed:
        return {
            "message": "No news found from provider", 
            "count": 0
        }

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
    
    return {
        "message": "Successfully fetched and saved news",
        "fetched_count": len(feed),
        "inserted_count": len(new_articles)
    }

#-----------------------
#     GET NEWS LIST
#-----------------------

@news_route.get("", response_model=NewsArticleListResponse)
async def get_news_list(db: SessionDep,
                        skip: int = Query(0, ge=0, description="Number of records to skip"),
                        limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return")):
    query = select(NewsArticle).order_by(NewsArticle.published_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    items = result.scalars().all()

    count_query = select(func.count()).select_from(NewsArticle)
    count_result = await db.execute(count_query)
    total = count_result.scalar_one()

    return NewsArticleListResponse(items=items, total=total)

#-----------------------
#   GET SPECIFIC NEWS
#-----------------------

@news_route.get("/{news_id}", response_model=NewsArticleResponse)
async def get_specific_news(db: SessionDep,
                            news_id: UUID):
    query = select(NewsArticle).where(NewsArticle.id == news_id)
    result = await db.execute(query)
    article = result.scalar_one_or_none()

    if not article:
        raise ArticleNotFound()

    return article
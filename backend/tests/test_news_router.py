"""
Integration-style tests for the /news router.

The FastAPI app is mounted with dependency overrides so no real DB or
network calls are made. All external I/O is mocked.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.core.database import get_session
from src.news.models import NewsArticle, NewsArticleTicker


# ── Helpers ────────────────────────���────────────────────────────���────────────

def _make_article(
    id=None,
    title="Test Article",
    url="https://example.com/article-1",
    ticker="AAPL",
    published_at=None,
):
    article = NewsArticle(
        title=title,
        summary="Test summary.",
        published_at=published_at or datetime(2026, 4, 5, 14, 30, tzinfo=timezone.utc),
        authors=None,
        url=url,
        source="Reuters",
        source_domain="reuters.com",
        primary_ticker=ticker,
        primary_topic=None,
        overall_sentiment_score=None,
        overall_sentiment_label=None,
        tickers=[NewsArticleTicker(ticker=ticker, relevance_score=None, sentiment_score=None)],
        topics=[],
    )
    article.id = id or uuid.uuid4()
    article.created_at = datetime(2026, 4, 5, 14, 31, tzinfo=timezone.utc)
    return article


def _mock_db_session(articles=None, total=None):
    """Return an AsyncMock that behaves like an AsyncSession."""
    db = AsyncMock()

    # make db.execute return an object whose scalars().all() gives articles,
    # and whose scalar_one() gives total.
    exec_result_items = MagicMock()
    exec_result_items.scalars.return_value.all.return_value = articles or []

    exec_result_total = MagicMock()
    exec_result_total.scalar_one.return_value = total if total is not None else len(articles or [])

    # existing_urls check (for POST /fetch dedup) — return empty set
    exec_result_urls = MagicMock()
    exec_result_urls.scalars.return_value.all.return_value = []

    # Cycle through multiple execute() call return values
    db.execute = AsyncMock(
        side_effect=[exec_result_urls, exec_result_items, exec_result_total]
    )
    db.add_all = MagicMock()
    db.commit = AsyncMock()
    return db


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── POST /news/fetch ────────────────────────────────────────────────��────────

@pytest.mark.asyncio
async def test_fetch_with_ticker_inserts_new_articles(async_client, yf_v1_item):
    articles = [_make_article()]
    db = _mock_db_session(articles=[])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.news.router.get_ticker_news", return_value=[yf_v1_item]) as mock_fetch, \
         patch("src.news.router.parse_yfinance_news_item", return_value=_make_article()):

        async with async_client as client:
            resp = await client.post("/news/fetch?ticker=AAPL&limit=5")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    data = resp.json()
    assert data["fetched_count"] == 1
    assert data["inserted_count"] == 1


@pytest.mark.asyncio
async def test_fetch_with_ticker_no_news_returns_zero(async_client):
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock(scalars=MagicMock(return_value=MagicMock(all=MagicMock(return_value=[])))))

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.news.router.get_ticker_news", return_value=[]):
        async with async_client as client:
            resp = await client.post("/news/fetch?ticker=AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["fetched_count"] == 0
    assert resp.json()["inserted_count"] == 0


@pytest.mark.asyncio
async def test_fetch_without_ticker_dispatches_celery_task(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    # The task is imported lazily inside the route handler, so patch at source.
    with patch("src.news.tasks.ingest_assets_news") as mock_task:
        mock_task.delay = MagicMock()
        async with async_client as client:
            resp = await client.post("/news/fetch")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["status"] == "queued"
    mock_task.delay.assert_called_once()


@pytest.mark.asyncio
async def test_fetch_skips_already_existing_url(async_client, yf_v1_item):
    """If the URL is already in the DB, inserted_count should be 0."""
    existing_url = "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"
    db = AsyncMock()

    # Return the URL as already existing
    url_result = MagicMock()
    url_result.scalars.return_value.all.return_value = [existing_url]
    db.execute = AsyncMock(return_value=url_result)
    db.add_all = MagicMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.news.router.get_ticker_news", return_value=[yf_v1_item]):
        async with async_client as client:
            resp = await client.post("/news/fetch?ticker=AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["inserted_count"] == 0
    db.add_all.assert_not_called()


# ── GET /news ──────────────────────────────────────────────────���─────────────

@pytest.mark.asyncio
async def test_get_news_list_returns_paginated_results(async_client):
    articles = [_make_article(url=f"https://example.com/{i}") for i in range(3)]
    db = AsyncMock()

    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = articles

    total_result = MagicMock()
    total_result.scalar_one.return_value = 10

    db.execute = AsyncMock(side_effect=[items_result, total_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?skip=0&limit=3")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 10
    assert len(body["items"]) == 3


@pytest.mark.asyncio
async def test_get_news_list_ticker_filter(async_client):
    """GET /news?ticker=AAPL should produce a query involving ticker filter."""
    articles = [_make_article()]
    db = AsyncMock()

    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = articles
    total_result = MagicMock()
    total_result.scalar_one.return_value = 1
    db.execute = AsyncMock(side_effect=[items_result, total_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?ticker=AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_news_list_empty_db(async_client):
    db = AsyncMock()
    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = []
    total_result = MagicMock()
    total_result.scalar_one.return_value = 0
    db.execute = AsyncMock(side_effect=[items_result, total_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json() == {"items": [], "total": 0}


# ── GET /news/{id} ────────────────────���───────────────────────────────────────

@pytest.mark.asyncio
async def test_get_specific_news_found(async_client):
    article = _make_article()
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = article
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get(f"/news/{article.id}")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["id"] == str(article.id)


@pytest.mark.asyncio
async def test_get_specific_news_not_found(async_client):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get(f"/news/{uuid.uuid4()}")

    app.dependency_overrides.clear()

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Article not found."


@pytest.mark.asyncio
async def test_get_specific_news_invalid_uuid(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news/not-a-valid-uuid")

    app.dependency_overrides.clear()

    assert resp.status_code == 400  # custom RequestValidationError handler returns 400

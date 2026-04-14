"""
Consolidated test suite for the news module.

Covers:
  Section A — Parser unit tests (pure Python, no DB, no network)
  Section B — Route API tests (AsyncClient with dependency-overridden DB)

External I/O (yfinance, DB, Celery) is fully mocked.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.core.database import get_session
from src.auth.dependencies import get_current_user
from src.auth.models import User
from src.news.models import NewsArticle, NewsArticleTicker
from src.news.get_news import (
    _extract_url,
    _extract_title,
    _extract_summary,
    _extract_published_at,
    _extract_source,
    _extract_related_tickers,
    parse_yfinance_news_item,
    get_tickers_news,
)


# ── Fixtures & helpers ────────────────────────────────────────────────────────

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
        tickers=[NewsArticleTicker(ticker=ticker, relevance_score=None)],
    )
    article.id = id or uuid.uuid4()
    article.created_at = datetime(2026, 4, 5, 14, 31, tzinfo=timezone.utc)
    article.updated_at = datetime(2026, 4, 5, 14, 31, tzinfo=timezone.utc)
    return article


def _make_admin_user():
    user = User(
        username="admin",
        email="admin@test.com",
        password_hash="hashed",
        is_verified=True,
        role="admin",
        is_banned=False,
    )
    user.id = uuid.uuid4()
    return user


def _make_regular_user():
    user = User(
        username="user",
        email="user@test.com",
        password_hash="hashed",
        is_verified=True,
        role="user",
        is_banned=False,
    )
    user.id = uuid.uuid4()
    return user


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION A — Parser Unit Tests
# ═══════════════════════════════════════════════════════════════════════════════

# ── _extract_url ──────────────────────────────────────────────────────────────

class TestExtractUrl:
    def test_v1_canonical_url(self, yf_v1_item):
        # A1
        url = _extract_url(yf_v1_item)
        assert url == "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"

    def test_v0_link(self, yf_v0_item):
        # A2
        url = _extract_url(yf_v0_item)
        assert url == "https://www.bloomberg.com/news/tesla-new-model-456"

    def test_missing_url_returns_none(self, yf_item_missing_url):
        # A3
        result = _extract_url(yf_item_missing_url)
        assert result is None

    def test_empty_item_returns_none(self):
        # A4
        assert _extract_url({}) is None


# ── _extract_title ────────────────────────────────────────────────────────────

class TestExtractTitle:
    def test_v1_title(self, yf_v1_item):
        # A5
        assert _extract_title(yf_v1_item) == "Apple Surges on Strong Earnings"

    def test_v0_title(self, yf_v0_item):
        # A6
        assert _extract_title(yf_v0_item) == "Tesla Unveils New Model"

    def test_empty_title_returns_empty_string(self, yf_item_missing_title):
        # A7
        assert _extract_title(yf_item_missing_title) == ""


# ── _extract_summary ──────────────────────────────────────────────────────────

class TestExtractSummary:
    def test_v1_summary(self, yf_v1_item):
        # A8
        assert "record quarter" in _extract_summary(yf_v1_item)

    def test_v0_no_summary_returns_empty(self, yf_v0_item):
        # A9
        assert _extract_summary(yf_v0_item) == ""

    def test_missing_content_returns_empty(self):
        # A10
        assert _extract_summary({}) == ""


# ── _extract_published_at ─────────────────────────────────────────────────────

class TestExtractPublishedAt:
    def test_v1_iso_format(self, yf_v1_item):
        # A11
        dt = _extract_published_at(yf_v1_item)
        assert dt is not None
        assert dt.tzinfo is not None
        assert dt.year == 2026
        assert dt.month == 4
        assert dt.day == 5
        assert dt.hour == 14
        assert dt.minute == 30

    def test_v0_unix_timestamp(self, yf_v0_item):
        # A12
        dt = _extract_published_at(yf_v0_item)
        assert dt is not None
        assert dt.tzinfo == timezone.utc
        assert dt.year == 2026

    def test_missing_date_returns_none(self, yf_item_missing_date):
        # A13
        assert _extract_published_at(yf_item_missing_date) is None

    def test_empty_item_returns_none(self):
        # A14
        assert _extract_published_at({}) is None


# ── _extract_source ───────────────────────────────────────────────────────────

class TestExtractSource:
    def test_v1_source_name_and_domain(self, yf_v1_item):
        # A15
        name, domain = _extract_source(yf_v1_item)
        assert name == "Reuters"
        assert domain == "www.reuters.com"

    def test_v1_scheme_stripped_from_domain(self, yf_v1_item):
        # A16
        _, domain = _extract_source(yf_v1_item)
        assert not domain.startswith("https://")
        assert not domain.startswith("http://")

    def test_v0_publisher(self, yf_v0_item):
        # A17
        name, domain = _extract_source(yf_v0_item)
        assert name == "Bloomberg"
        assert domain is None

    def test_empty_item_returns_nones(self):
        # A18
        name, domain = _extract_source({})
        assert name is None
        assert domain is None


# ── _extract_related_tickers ──────────────────────────────────────────────────

class TestExtractRelatedTickers:
    def test_v1_dict_format(self, yf_v1_item):
        # A19
        tickers = _extract_related_tickers(yf_v1_item)
        assert "AAPL" in tickers
        assert "MSFT" in tickers

    def test_v0_string_list(self, yf_v0_item):
        # A20
        tickers = _extract_related_tickers(yf_v0_item)
        assert tickers == ["TSLA", "GM"]

    def test_empty_related_tickers(self):
        # A21
        item = {"content": {"title": "x", "relatedTickers": []}}
        assert _extract_related_tickers(item) == []

    def test_no_related_tickers_key(self):
        # A22
        item = {"content": {"title": "x"}}
        assert _extract_related_tickers(item) == []


# ── parse_yfinance_news_item ──────────────────────────────────────────────────

class TestParseYfinanceNewsItem:
    def test_v1_returns_article(self, yf_v1_item):
        # A23
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        assert isinstance(article, NewsArticle)
        assert article.title == "Apple Surges on Strong Earnings"
        assert article.url == "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"
        assert article.source == "Reuters"
        assert article.source_domain == "www.reuters.com"

    def test_v0_returns_article(self, yf_v0_item):
        # A24
        article = parse_yfinance_news_item(yf_v0_item, "TSLA")
        assert isinstance(article, NewsArticle)
        assert article.title == "Tesla Unveils New Model"

    def test_source_ticker_always_in_tickers_list(self, yf_v1_item):
        # A25 — AAPL is already in relatedTickers; should not be duplicated
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert ticker_symbols.count("AAPL") == 1

    def test_source_ticker_added_when_not_in_related(self, yf_v0_item):
        # A26 — Fetch for NVDA but relatedTickers only has TSLA, GM
        article = parse_yfinance_news_item(yf_v0_item, "NVDA")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert "NVDA" in ticker_symbols
        assert "TSLA" in ticker_symbols
        assert "GM" in ticker_symbols

    def test_no_duplicate_tickers_in_tickers_list(self, yf_v1_item):
        # A27
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        ticker_symbols = [t.ticker for t in article.tickers]
        assert len(ticker_symbols) == len(set(ticker_symbols))

    def test_ticker_rows_have_null_relevance_score(self, yf_v1_item):
        # A28
        article = parse_yfinance_news_item(yf_v1_item, "AAPL")
        for t in article.tickers:
            assert t.relevance_score is None

    def test_missing_title_returns_none(self, yf_item_missing_title):
        # A29
        result = parse_yfinance_news_item(yf_item_missing_title, "X")
        assert result is None

    def test_missing_url_returns_none(self, yf_item_missing_url):
        # A30
        result = parse_yfinance_news_item(yf_item_missing_url, "X")
        assert result is None

    def test_missing_date_returns_none(self, yf_item_missing_date):
        # A31
        result = parse_yfinance_news_item(yf_item_missing_date, "X")
        assert result is None

    def test_title_truncated_to_512_chars(self):
        # A32
        long_title = "A" * 600
        item = {
            "content": {
                "title": long_title,
                "pubDate": "2026-04-05T10:00:00Z",
                "canonicalUrl": {"url": "https://example.com/long-title"},
            }
        }
        article = parse_yfinance_news_item(item, "TEST")
        assert len(article.title) == 512

    def test_url_truncated_to_1024_chars(self):
        # A33
        long_url = "https://example.com/" + "x" * 1100
        item = {
            "content": {
                "title": "Title",
                "pubDate": "2026-04-05T10:00:00Z",
                "canonicalUrl": {"url": long_url},
            }
        }
        article = parse_yfinance_news_item(item, "TEST")
        assert len(article.url) == 1024

    def test_empty_summary_stored_as_none(self, yf_v0_item):
        # A34 — yf_v0_item has no summary field → _extract_summary returns "" → parser stores None
        article = parse_yfinance_news_item(yf_v0_item, "TSLA")
        assert article.summary is None


# ── get_tickers_news deduplication ───────────────────────────────────────────

class TestGetTickersNewsDedup:
    def test_cross_ticker_dedup_by_url(self, monkeypatch, yf_v1_item):
        # A35 — same article URL for every ticker → only first pair kept
        def mock_get_news(ticker, count):
            return [yf_v1_item]

        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        pairs = get_tickers_news(["AAPL", "MSFT", "GOOG"], count_per_ticker=5)
        assert len(pairs) == 1
        assert pairs[0][0] == "AAPL"

    def test_distinct_urls_all_kept(self, monkeypatch, yf_v1_item, yf_v0_item):
        # A36
        def mock_get_news(ticker, count):
            return [yf_v1_item] if ticker == "AAPL" else [yf_v0_item]

        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        pairs = get_tickers_news(["AAPL", "TSLA"], count_per_ticker=5)
        assert len(pairs) == 2

    def test_empty_ticker_list_returns_empty(self, monkeypatch):
        # A37
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)
        assert get_tickers_news([], count_per_ticker=10) == []

    def test_yfinance_error_skips_ticker(self, monkeypatch):
        # A38 — a failing ticker should not crash the whole fetch
        def mock_get_news(ticker, count):
            if ticker == "BAD":
                raise RuntimeError("network error")
            return []

        monkeypatch.setattr("src.news.get_news.get_ticker_news", mock_get_news)
        monkeypatch.setattr("src.news.get_news.time.sleep", lambda _: None)

        result = get_tickers_news(["AAPL", "BAD", "TSLA"])
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION B — Route API Tests
# ═══════════════════════════════════════════════════════════════════════════════

# ── POST /news/fetch ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fetch_with_ticker_inserts_new_articles(async_client, yf_v1_item):
    # B1
    db = AsyncMock()
    url_result = MagicMock()
    url_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=url_result)
    db.add_all = MagicMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.news.router.get_ticker_news", return_value=[yf_v1_item]), \
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
    # B2
    db = AsyncMock()

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
    # B3
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

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
    # B4
    existing_url = "https://finance.yahoo.com/news/apple-surges-strong-earnings-143000.html"
    db = AsyncMock()
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


# ── GET /news ─────────────────────────────────────────────────────────────────

def _db_with_list(articles, total):
    db = AsyncMock()
    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = articles
    total_result = MagicMock()
    total_result.scalar_one.return_value = total
    db.execute = AsyncMock(side_effect=[items_result, total_result])
    return db


@pytest.mark.asyncio
async def test_get_news_list_returns_paginated_results(async_client):
    # B5
    articles = [_make_article(url=f"https://example.com/{i}") for i in range(3)]
    db = _db_with_list(articles, total=10)

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
    assert body["skip"] == 0
    assert body["limit"] == 3


@pytest.mark.asyncio
async def test_get_news_list_response_includes_skip_limit(async_client):
    # B6
    db = _db_with_list([], total=0)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?skip=5&limit=10")

    app.dependency_overrides.clear()

    body = resp.json()
    assert resp.status_code == 200
    assert body["skip"] == 5
    assert body["limit"] == 10


@pytest.mark.asyncio
async def test_get_news_list_ticker_filter(async_client):
    # B7
    articles = [_make_article()]
    db = _db_with_list(articles, total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?ticker=AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["total"] == 1


@pytest.mark.asyncio
async def test_get_news_list_from_date_filter(async_client):
    # B8
    db = _db_with_list([_make_article()], total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?from_date=2026-01-01T00:00:00Z")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_to_date_filter(async_client):
    # B9
    db = _db_with_list([_make_article()], total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?to_date=2026-12-31T23:59:59Z")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_valid_date_range(async_client):
    # B10
    db = _db_with_list([_make_article()], total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?from_date=2026-01-01T00:00:00Z&to_date=2026-12-31T23:59:59Z")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_invalid_date_range_returns_400(async_client):
    # B11
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?from_date=2026-12-01T00:00:00Z&to_date=2026-01-01T00:00:00Z")

    app.dependency_overrides.clear()
    assert resp.status_code == 400
    assert "from_date" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_get_news_list_source_filter(async_client):
    # B12
    db = _db_with_list([_make_article()], total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?source=reuters")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_sort_by_published_at_asc(async_client):
    # B13
    db = _db_with_list([], total=0)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?sort_by=published_at&order=asc")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_sort_by_created_at_desc(async_client):
    # B14
    db = _db_with_list([], total=0)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?sort_by=created_at&order=desc")

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_get_news_list_invalid_sort_by_returns_422(async_client):
    # B15
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news?sort_by=not_a_field")

    app.dependency_overrides.clear()
    # The project's global RequestValidationError handler converts 422 → 400
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_news_list_empty_db(async_client):
    # B16
    db = _db_with_list([], total=0)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0
    assert body["skip"] == 0
    assert body["limit"] == 20


@pytest.mark.asyncio
async def test_get_news_list_multiple_filters_combined(async_client):
    # B17
    db = _db_with_list([_make_article()], total=1)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get(
            "/news?ticker=AAPL&from_date=2026-01-01T00:00:00Z&source=reuters"
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200


# ── GET /news/{id} ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_specific_news_found(async_client):
    # B18
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
    # B19
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
    # B20
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/news/not-a-valid-uuid")

    app.dependency_overrides.clear()

    assert resp.status_code in (400, 422)


# ── POST /news (admin create) ─────────────────────────────────────────────────

_CREATE_PAYLOAD = {
    "title": "Admin Article",
    "summary": "Summary here.",
    "published_at": "2026-04-14T10:00:00Z",
    "url": "https://example.com/admin-article-001",
    "tickers": ["AAPL"],
}


@pytest.mark.asyncio
async def test_post_news_admin_creates_article_no_tickers(async_client):
    # B21
    admin = _make_admin_user()
    article = _make_article()

    db = AsyncMock()
    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=check_result)
    db.add = MagicMock()
    db.commit = AsyncMock()

    async def _set_attrs(obj):
        obj.id = article.id
        obj.created_at = article.created_at
        obj.updated_at = article.updated_at
        obj.tickers = []

    db.refresh = AsyncMock(side_effect=_set_attrs)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    payload = {**_CREATE_PAYLOAD, "tickers": []}
    async with async_client as client:
        resp = await client.post("/news", json=payload)

    app.dependency_overrides.clear()
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_post_news_admin_creates_article_with_tickers(async_client):
    # B22
    admin = _make_admin_user()
    article = _make_article()

    db = AsyncMock()
    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=check_result)
    db.add = MagicMock()
    db.commit = AsyncMock()

    async def _set_attrs(obj):
        obj.id = article.id
        obj.created_at = article.created_at
        obj.updated_at = article.updated_at
        obj.tickers = [NewsArticleTicker(ticker="AAPL", relevance_score=None)]

    db.refresh = AsyncMock(side_effect=_set_attrs)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.post("/news", json=_CREATE_PAYLOAD)

    app.dependency_overrides.clear()
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_post_news_duplicate_url_returns_409(async_client):
    # B23
    admin = _make_admin_user()
    existing_article = _make_article(url=_CREATE_PAYLOAD["url"])

    db = AsyncMock()
    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = existing_article
    db.execute = AsyncMock(return_value=check_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.post("/news", json=_CREATE_PAYLOAD)

    app.dependency_overrides.clear()
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_post_news_unauthenticated_returns_401(async_client):
    # B24 — no get_current_user override → real dependency fires → no token → 401
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.post("/news", json=_CREATE_PAYLOAD)

    app.dependency_overrides.clear()
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_post_news_non_admin_returns_403(async_client):
    # B25
    regular = _make_regular_user()

    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: regular

    async with async_client as client:
        resp = await client.post("/news", json=_CREATE_PAYLOAD)

    app.dependency_overrides.clear()
    assert resp.status_code == 403


# ── PUT /news/{id} (admin update) ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_put_news_admin_updates_title(async_client):
    # B26
    admin = _make_admin_user()
    article = _make_article()

    db = AsyncMock()
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = article
    db.execute = AsyncMock(return_value=find_result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.put(f"/news/{article.id}", json={"title": "Updated Title"})

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_put_news_admin_replaces_tickers(async_client):
    # B27
    admin = _make_admin_user()
    article = _make_article()

    db = AsyncMock()
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = article
    db.execute = AsyncMock(return_value=find_result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.put(f"/news/{article.id}", json={"tickers": ["GOOGL"]})

    app.dependency_overrides.clear()
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_put_news_not_found_returns_404(async_client):
    # B28
    admin = _make_admin_user()

    db = AsyncMock()
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=find_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.put(f"/news/{uuid.uuid4()}", json={"title": "X"})

    app.dependency_overrides.clear()
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_put_news_unauthenticated_returns_401(async_client):
    # B29
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.put(f"/news/{uuid.uuid4()}", json={"title": "X"})

    app.dependency_overrides.clear()
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_put_news_non_admin_returns_403(async_client):
    # B30
    regular = _make_regular_user()

    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: regular

    async with async_client as client:
        resp = await client.put(f"/news/{uuid.uuid4()}", json={"title": "X"})

    app.dependency_overrides.clear()
    assert resp.status_code == 403


# ── DELETE /news/{id} (admin delete) ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_news_admin_deletes_article(async_client):
    # B31
    admin = _make_admin_user()
    article = _make_article()

    db = AsyncMock()
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = article
    db.execute = AsyncMock(return_value=find_result)
    db.delete = AsyncMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.delete(f"/news/{article.id}")

    app.dependency_overrides.clear()
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_news_not_found_returns_404(async_client):
    # B32
    admin = _make_admin_user()

    db = AsyncMock()
    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=find_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: admin

    async with async_client as client:
        resp = await client.delete(f"/news/{uuid.uuid4()}")

    app.dependency_overrides.clear()
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_news_unauthenticated_returns_401(async_client):
    # B33
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.delete(f"/news/{uuid.uuid4()}")

    app.dependency_overrides.clear()
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_news_non_admin_returns_403(async_client):
    # B34
    regular = _make_regular_user()

    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: regular

    async with async_client as client:
        resp = await client.delete(f"/news/{uuid.uuid4()}")

    app.dependency_overrides.clear()
    assert resp.status_code == 403

"""
Performance tests — rate limiting middleware (src.core.rate_limiter).

The middleware is tested by mocking both the Redis client (with a stateful
counter) and the DB session dependency so no live infrastructure is required.
/health is in EXCLUDED_PATHS, so tests that need rate limiting to fire use
/price/tickers instead.
"""
from unittest.mock import AsyncMock, patch, MagicMock
import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.core.config import settings
from src.core.database import get_session


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_stateful_redis(initial_count: int = 0, ttl: int = 60):
    """AsyncMock Redis whose INCR increments a shared in-memory counter."""
    counter = {"value": initial_count}

    async def _incr(key):
        counter["value"] += 1
        return counter["value"]

    mock_redis = AsyncMock()
    mock_redis.incr = _incr
    mock_redis.expire = AsyncMock()
    mock_redis.ttl = AsyncMock(return_value=ttl)
    return mock_redis


def _mock_db_session():
    """AsyncMock DB session that returns an empty scalars list for any query."""
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    return db


def _db_override():
    db = _mock_db_session()
    async def _gen():
        yield db
    return _gen


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_requests_within_limit_pass():
    """
    The first RATE_LIMIT_REQUESTS unauthenticated requests must all pass (not 429).
    Uses /health which is excluded from rate limiting — verifying no false positives.
    """
    limit = settings.RATE_LIMIT_REQUESTS
    mock_redis = _make_stateful_redis(initial_count=0)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            for i in range(min(limit, 5)):  # cap at 5 to keep tests fast
                resp = await client.get("/health")
                assert resp.status_code != 429, f"Request {i+1} was rate-limited on excluded path"


@pytest.mark.asyncio
async def test_request_exceeding_limit_returns_429():
    """
    When the Redis counter is already at the limit, the next request must return 429.
    Uses /price/tickers (a non-excluded endpoint) so the middleware actually applies.
    """
    limit = settings.RATE_LIMIT_REQUESTS
    mock_redis = _make_stateful_redis(initial_count=limit)  # already at limit

    app.dependency_overrides[get_session] = _db_override()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            resp = await client.get("/price/tickers")

    app.dependency_overrides.clear()

    assert resp.status_code == 429
    assert "Too many requests" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_rate_limit_headers_present_on_normal_request():
    """
    Responses for non-excluded requests within the limit must carry X-RateLimit-* headers.
    """
    mock_redis = _make_stateful_redis(initial_count=0)

    app.dependency_overrides[get_session] = _db_override()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("src.core.rate_limiter.get_redis", return_value=mock_redis):
            resp = await client.get("/price/tickers")

    app.dependency_overrides.clear()

    assert "X-RateLimit-Limit" in resp.headers
    assert "X-RateLimit-Remaining" in resp.headers
    assert "X-RateLimit-Reset" in resp.headers


@pytest.mark.asyncio
async def test_excluded_path_bypasses_rate_limit():
    """
    /health is in EXCLUDED_PATHS — the middleware must skip Redis entirely,
    even when the counter would exceed the limit.
    """
    mock_get_redis = MagicMock(return_value=_make_stateful_redis(initial_count=9999))

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        with patch("src.core.rate_limiter.get_redis", mock_get_redis):
            resp = await client.get("/health")

    mock_get_redis.assert_not_called()
    assert resp.status_code == 200

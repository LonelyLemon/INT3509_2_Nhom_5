"""
Integration-style tests for the /price router.

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
from src.auth.dependencies import get_current_user
from src.price.models import Asset, PriceData
from src.price.constants import AssetType


# ── Helpers ──────────────────────────────────────────────────────────────────

def _make_asset(
    ticker="AAPL",
    asset_type=AssetType.STOCK,
    name="Apple Inc.",
    is_active=True,
):
    asset = Asset(
        ticker=ticker,
        name=name,
        asset_type=asset_type,
        is_active=is_active,
    )
    asset.id = uuid.uuid4()
    asset.created_at = datetime(2026, 4, 1, tzinfo=timezone.utc)
    asset.updated_at = datetime(2026, 4, 1, tzinfo=timezone.utc)
    asset.price_data = []
    return asset


def _make_price_row(asset_id, ts_offset_minutes=0):
    row = PriceData(
        asset_id=asset_id,
        timestamp=datetime(2026, 4, 5, 14, ts_offset_minutes, tzinfo=timezone.utc),
        timeframe="1m",
        open=150.0,
        high=151.0,
        low=149.5,
        close=150.5,
        adj_close=150.5,
        volume=10000.0,
    )
    row.id = uuid.uuid4()
    row.created_at = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
    row.updated_at = datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc)
    return row


def _make_admin_user():
    user = MagicMock()
    user.role = "admin"
    return user


def _make_regular_user():
    user = MagicMock()
    user.role = "user"
    return user


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── GET /price/tickers ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_tickers_returns_all(async_client):
    assets = [_make_asset("AAPL"), _make_asset("TSLA", AssetType.STOCK)]
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = assets
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/tickers")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_list_tickers_filter_by_asset_type(async_client):
    assets = [_make_asset("BTC", AssetType.CRYPTO)]
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = assets
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/tickers?asset_type=CRYPTO")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()[0]["ticker"] == "BTC"


@pytest.mark.asyncio
async def test_list_tickers_filter_by_is_active(async_client):
    assets = [_make_asset("AAPL", is_active=False)]
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = assets
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/tickers?is_active=false")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()[0]["is_active"] is False


# ── POST /price/tickers ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_add_ticker_as_admin_returns_201(async_client):
    asset = _make_asset()
    db = AsyncMock()

    # First execute: duplicate check returns None (ticker not found)
    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=check_result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=lambda a: setattr(a, "id", asset.id) or
                           setattr(a, "created_at", asset.created_at) or
                           setattr(a, "updated_at", asset.updated_at))

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.post("/price/tickers", json={
            "ticker": "AAPL",
            "asset_type": "STOCK",
            "is_active": True,
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_add_ticker_normalizes_to_uppercase(async_client):
    asset = _make_asset("TSLA")
    db = AsyncMock()

    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=check_result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=lambda a: setattr(a, "id", asset.id) or
                           setattr(a, "created_at", asset.created_at) or
                           setattr(a, "updated_at", asset.updated_at))

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.post("/price/tickers", json={
            "ticker": "tsla",  # lowercase input
            "asset_type": "STOCK",
            "is_active": True,
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["ticker"] == "TSLA"


@pytest.mark.asyncio
async def test_add_duplicate_ticker_returns_409(async_client):
    existing = _make_asset()
    db = AsyncMock()
    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = existing  # already exists
    db.execute = AsyncMock(return_value=check_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.post("/price/tickers", json={
            "ticker": "AAPL",
            "asset_type": "STOCK",
            "is_active": True,
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 409
    assert "already exists" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_add_ticker_non_admin_returns_403(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_regular_user()

    async with async_client as client:
        resp = await client.post("/price/tickers", json={
            "ticker": "AAPL",
            "asset_type": "STOCK",
            "is_active": True,
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 403


# ── GET /price/tickers/{ticker} ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_ticker_found(async_client):
    asset = _make_asset()
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = asset
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/tickers/AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["ticker"] == "AAPL"


@pytest.mark.asyncio
async def test_get_ticker_not_found_returns_404(async_client):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/tickers/ZZZZ")

    app.dependency_overrides.clear()

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Ticker not found."


# ── PATCH /price/tickers/{ticker} ─────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_ticker_as_admin(async_client):
    asset = _make_asset()
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = asset
    db.execute = AsyncMock(return_value=result)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.patch("/price/tickers/AAPL", json={"is_active": False})

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert asset.is_active is False  # setattr was applied


@pytest.mark.asyncio
async def test_update_ticker_not_found_returns_404(async_client):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.patch("/price/tickers/ZZZZ", json={"is_active": False})

    app.dependency_overrides.clear()

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_ticker_non_admin_returns_403(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_regular_user()

    async with async_client as client:
        resp = await client.patch("/price/tickers/AAPL", json={"is_active": False})

    app.dependency_overrides.clear()

    assert resp.status_code == 403


# ── DELETE /price/tickers/{ticker} ────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_ticker_as_admin_returns_204(async_client):
    asset = _make_asset()
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = asset
    db.execute = AsyncMock(return_value=result)
    db.delete = AsyncMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.delete("/price/tickers/AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 204
    db.delete.assert_called_once_with(asset)


@pytest.mark.asyncio
async def test_delete_ticker_not_found_returns_404(async_client):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    async with async_client as client:
        resp = await client.delete("/price/tickers/ZZZZ")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_ticker_non_admin_returns_403(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_regular_user()

    async with async_client as client:
        resp = await client.delete("/price/tickers/AAPL")

    app.dependency_overrides.clear()

    assert resp.status_code == 403


# ── GET /price/{ticker} ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_price_history_invalid_timeframe_returns_400(async_client):
    """InvalidTimeframe is raised before any DB call — no session mock needed."""
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL?timeframe=3m")

    app.dependency_overrides.clear()

    assert resp.status_code == 400
    assert "Invalid timeframe" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_get_price_history_unknown_ticker_returns_404(async_client):
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/ZZZZ?timeframe=1m")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_price_history_1m_returns_candles(async_client):
    asset = _make_asset()
    rows = [_make_price_row(asset.id, i) for i in range(3)]

    db = AsyncMock()
    asset_result = MagicMock()
    asset_result.scalar_one_or_none.return_value = asset

    price_result = MagicMock()
    price_result.scalars.return_value.all.return_value = list(reversed(rows))  # DESC from DB

    db.execute = AsyncMock(side_effect=[asset_result, price_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL?timeframe=1m&limit=3")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["ticker"] == "AAPL"
    assert body["timeframe"] == "1m"
    assert len(body["data"]) == 3
    # Response should be ascending (oldest first)
    assert body["data"][0]["close"] == 150.5


@pytest.mark.asyncio
async def test_get_price_history_empty_data_returns_empty_list(async_client):
    asset = _make_asset()
    db = AsyncMock()
    asset_result = MagicMock()
    asset_result.scalar_one_or_none.return_value = asset

    price_result = MagicMock()
    price_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(side_effect=[asset_result, price_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL?timeframe=1m")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["data"] == []


@pytest.mark.asyncio
async def test_get_price_history_bucketed_5m(async_client):
    """For non-1m timeframes the router uses raw SQL via time_bucket()."""
    asset = _make_asset()
    bucket_row = {
        "timestamp": datetime(2026, 4, 5, 14, 0, tzinfo=timezone.utc).isoformat(),
        "open": 150.0,
        "high": 151.0,
        "low": 149.5,
        "close": 150.5,
        "volume": 50000.0,
    }

    db = AsyncMock()
    asset_result = MagicMock()
    asset_result.scalar_one_or_none.return_value = asset

    bucket_result = MagicMock()
    # time_bucket path calls .mappings().all()
    bucket_result.mappings.return_value.all.return_value = [bucket_row]
    db.execute = AsyncMock(side_effect=[asset_result, bucket_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL?timeframe=5m&limit=100")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["timeframe"] == "5m"
    assert len(body["data"]) == 1
    assert body["data"][0]["close"] == 150.5


# ── GET /price/{ticker}/latest ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_latest_price_found(async_client):
    asset = _make_asset()
    row = _make_price_row(asset.id)

    db = AsyncMock()
    asset_result = MagicMock()
    asset_result.scalar_one_or_none.return_value = asset

    price_result = MagicMock()
    price_result.scalar_one_or_none.return_value = row
    db.execute = AsyncMock(side_effect=[asset_result, price_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL/latest")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["ticker"] == "AAPL"
    assert body["close"] == 150.5


@pytest.mark.asyncio
async def test_get_latest_price_no_data_returns_404(async_client):
    asset = _make_asset()

    db = AsyncMock()
    asset_result = MagicMock()
    asset_result.scalar_one_or_none.return_value = asset

    price_result = MagicMock()
    price_result.scalar_one_or_none.return_value = None  # no price data yet
    db.execute = AsyncMock(side_effect=[asset_result, price_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/price/AAPL/latest")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


# ── POST /price/fetch ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_trigger_ingestion_as_admin_returns_202(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_admin_user()

    with patch("src.price.tasks.ingest_1m_price_data") as mock_task:
        mock_task.delay = MagicMock()
        async with async_client as client:
            resp = await client.post("/price/fetch")

    app.dependency_overrides.clear()

    assert resp.status_code == 202
    assert resp.json()["status"] == "queued"
    mock_task.delay.assert_called_once()


@pytest.mark.asyncio
async def test_trigger_ingestion_non_admin_returns_403(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: _make_regular_user()

    async with async_client as client:
        resp = await client.post("/price/fetch")

    app.dependency_overrides.clear()

    assert resp.status_code == 403

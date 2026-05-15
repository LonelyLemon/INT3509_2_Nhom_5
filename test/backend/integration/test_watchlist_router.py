"""
Integration tests for /watchlist router.
All DB access is mocked — no live PostgreSQL required.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.core.database import get_session
from src.auth.dependencies import get_current_user
from src.watchlist.models import WatchlistItem
from src.price.models import Asset
from src.price.constants import AssetType


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = "user"
    return user


def _make_asset(ticker: str = "AAPL") -> Asset:
    a = Asset(ticker=ticker, name="Apple Inc.", asset_type=AssetType.STOCK, is_active=True)
    a.id = uuid.uuid4()
    a.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    a.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return a


def _make_watchlist_item(user_id: uuid.UUID, asset: Asset) -> WatchlistItem:
    item = WatchlistItem(user_id=user_id, asset_id=asset.id, position=0)
    item.id = uuid.uuid4()
    item.asset = asset
    item.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    item.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return item


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── GET /watchlist ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_watchlist_authenticated_returns_200(async_client):
    user = _make_user()
    db = AsyncMock()

    # Empty watchlist — scalar result for items list
    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=items_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get("/watchlist")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["items"] == []
    assert body["total"] == 0


@pytest.mark.asyncio
async def test_get_watchlist_unauthenticated_returns_401(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.get("/watchlist")

    app.dependency_overrides.clear()

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_watchlist_with_items(async_client):
    user = _make_user()
    asset = _make_asset("TSLA")
    item = _make_watchlist_item(user.id, asset)
    db = AsyncMock()

    items_result = MagicMock()
    items_result.scalars.return_value.all.return_value = [item]

    # _latest_two_prices executes a subquery and iterates rows
    prices_result = MagicMock()
    prices_result.__iter__ = MagicMock(return_value=iter([]))

    db.execute = AsyncMock(side_effect=[items_result, prices_result])

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get("/watchlist")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 1
    assert body["items"][0]["asset"]["ticker"] == "TSLA"


# ── DELETE /watchlist/{asset_id} ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_remove_watchlist_item_returns_204(async_client):
    user = _make_user()
    asset = _make_asset()
    item = _make_watchlist_item(user.id, asset)
    db = AsyncMock()

    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = item
    db.execute = AsyncMock(return_value=find_result)
    db.delete = AsyncMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.delete(f"/watchlist/{asset.id}")

    app.dependency_overrides.clear()

    assert resp.status_code == 204
    db.delete.assert_called_once_with(item)


@pytest.mark.asyncio
async def test_remove_nonexistent_watchlist_item_returns_404(async_client):
    user = _make_user()
    db = AsyncMock()

    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=find_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.delete(f"/watchlist/{uuid.uuid4()}")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


# ── PATCH /watchlist/reorder ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_reorder_watchlist_returns_200(async_client):
    user = _make_user()
    asset1_id = uuid.uuid4()
    asset2_id = uuid.uuid4()
    db = AsyncMock()
    db.execute = AsyncMock(return_value=MagicMock())
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.patch("/watchlist/reorder", json={
            "items": [
                {"asset_id": str(asset1_id), "position": 0},
                {"asset_id": str(asset2_id), "position": 1},
            ]
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert "reordered" in resp.json()["message"].lower()

"""
Integration tests for /portfolio router.
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
from src.portfolio.models import Portfolio, Holding
from src.price.models import Asset
from src.price.constants import AssetType


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = "user"
    return user


def _make_portfolio(user_id: uuid.UUID, name: str = "My Portfolio") -> Portfolio:
    p = Portfolio(user_id=user_id, name=name, description=None, is_default=True)
    p.id = uuid.uuid4()
    p.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.holdings = []
    return p


def _make_asset(ticker: str = "AAPL") -> Asset:
    a = Asset(ticker=ticker, name="Apple Inc.", asset_type=AssetType.STOCK, is_active=True)
    a.id = uuid.uuid4()
    a.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    a.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return a


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── GET /portfolio ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_portfolios_returns_list(async_client):
    user = _make_user()
    portfolio = _make_portfolio(user.id)
    db = AsyncMock()

    result = MagicMock()
    result.scalars.return_value.all.return_value = [portfolio]
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get("/portfolio")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["name"] == "My Portfolio"


@pytest.mark.asyncio
async def test_list_portfolios_unauthenticated_returns_401(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    # No get_current_user override → real dependency runs → no token → 401

    async with async_client as client:
        resp = await client.get("/portfolio")

    app.dependency_overrides.clear()

    assert resp.status_code == 401


# ── POST /portfolio ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_portfolio_returns_201(async_client):
    user = _make_user()
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    new_id = uuid.uuid4()
    now = datetime(2026, 1, 1, tzinfo=timezone.utc)

    async def mock_refresh(obj):
        obj.id = new_id
        obj.created_at = now
        obj.updated_at = now

    db.refresh = AsyncMock(side_effect=mock_refresh)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.post("/portfolio", json={
            "name": "Growth Portfolio",
            "description": "Long-term growth",
            "is_default": False,
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["name"] == "Growth Portfolio"


# ── GET /portfolio/{id} ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_portfolio_not_found_returns_404(async_client):
    user = _make_user()
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get(f"/portfolio/{uuid.uuid4()}")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_portfolio_detail_with_empty_holdings(async_client):
    user = _make_user()
    portfolio = _make_portfolio(user.id)  # holdings = []
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = portfolio
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get(f"/portfolio/{portfolio.id}")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "My Portfolio"
    assert body["holdings"] == []
    assert body["summary"]["total_value"] == 0.0


# ── DELETE /portfolio/{id} ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_portfolio_returns_204(async_client):
    user = _make_user()
    portfolio = _make_portfolio(user.id)
    portfolio.is_default = False  # skip next-portfolio promotion logic
    db = AsyncMock()

    find_result = MagicMock()
    find_result.scalar_one_or_none.return_value = portfolio
    db.execute = AsyncMock(return_value=find_result)
    db.delete = AsyncMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.delete(f"/portfolio/{portfolio.id}")

    app.dependency_overrides.clear()

    assert resp.status_code == 204
    db.delete.assert_called_once_with(portfolio)

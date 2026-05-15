"""
Integration tests for /auth router.
All DB and external services (email, Redis) are mocked — no live infrastructure needed.
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


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user(is_verified: bool = True, is_banned: bool = False, role: str = "user"):
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.username = "testuser"
    user.email = "test@example.com"
    user.password_hash = "$2b$12$fakehashvalue"
    user.is_verified = is_verified
    user.is_banned = is_banned
    user.role = role
    user.display_name = None
    user.avatar_url = None
    user.bio = None
    user.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    user.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return user


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── POST /auth/register ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(async_client):
    new_user = _make_user(is_verified=False)
    db = AsyncMock()

    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = None  # no existing user
    db.execute = AsyncMock(return_value=check_result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock(side_effect=lambda u: (
        setattr(u, "id", new_user.id) or
        setattr(u, "is_verified", False) or
        setattr(u, "role", "user") or
        setattr(u, "created_at", new_user.created_at) or
        setattr(u, "updated_at", new_user.updated_at)
    ))

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.auth.router.email_service_basic"):
        async with async_client as client:
            resp = await client.post("/auth/register", json={
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "Password123!",
            })

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == "newuser@example.com"
    assert body["username"] == "newuser"


@pytest.mark.asyncio
async def test_register_duplicate_email_returns_409(async_client):
    existing = _make_user()
    db = AsyncMock()

    check_result = MagicMock()
    check_result.scalar_one_or_none.return_value = existing
    db.execute = AsyncMock(return_value=check_result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    async with async_client as client:
        resp = await client.post("/auth/register", json={
            "username": "testuser",
            "email": "existing@example.com",
            "password": "Password123!",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 409
    assert "already exist" in resp.json()["detail"]


# ── POST /auth/login ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_login_success_returns_tokens(async_client):
    user = _make_user()
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.auth.router.verify_pw", return_value=True):
        async with async_client as client:
            resp = await client.post("/auth/login", data={
                "username": "test@example.com",
                "password": "Password123!",
            })

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body


@pytest.mark.asyncio
async def test_login_wrong_password_returns_400(async_client):
    user = _make_user()
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.auth.router.verify_pw", return_value=False):
        async with async_client as client:
            resp = await client.post("/auth/login", data={
                "username": "test@example.com",
                "password": "WrongPassword",
            })

    app.dependency_overrides.clear()

    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_banned_user_returns_403(async_client):
    user = _make_user(is_banned=True)
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = user
    db.execute = AsyncMock(return_value=result)

    async def override_session():
        yield db

    app.dependency_overrides[get_session] = override_session

    with patch("src.auth.router.verify_pw", return_value=True):
        async with async_client as client:
            resp = await client.post("/auth/login", data={
                "username": "banned@example.com",
                "password": "Password123!",
            })

    app.dependency_overrides.clear()

    assert resp.status_code == 403


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_me_authenticated(async_client):
    user = _make_user()

    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    async with async_client as client:
        resp = await client.get("/auth/me")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


@pytest.mark.asyncio
async def test_get_me_unauthenticated_returns_401(async_client):
    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session

    # No Authorization header → HTTPBearer returns None → UserNotAuthenticated (401)
    with patch("src.core.redis.get_redis", return_value=None):
        async with async_client as client:
            resp = await client.get("/auth/me")

    app.dependency_overrides.clear()

    assert resp.status_code == 401


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_logout_success(async_client):
    user = _make_user()

    async def override_session():
        yield AsyncMock()

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    with patch("src.auth.router.get_redis", return_value=None):
        async with async_client as client:
            resp = await client.post("/auth/logout")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["message"] == "Logged out successfully"

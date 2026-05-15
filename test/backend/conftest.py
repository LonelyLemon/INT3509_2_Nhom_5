"""Shared helpers and fixtures for /test/backend."""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


def make_user(role: str = "user", is_verified: bool = True, is_banned: bool = False):
    user = MagicMock()
    user.id = uuid.uuid4()
    user.username = "testuser"
    user.email = "test@example.com"
    user.password_hash = "$2b$12$fakehashvalue"
    user.role = role
    user.is_verified = is_verified
    user.is_banned = is_banned
    user.display_name = "Test User"
    user.avatar_url = None
    user.bio = None
    user.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    user.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return user


def make_mock_db():
    return AsyncMock()


def session_override(db):
    async def _gen():
        yield db
    return _gen

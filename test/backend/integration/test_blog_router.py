"""
Integration tests for /blog router.
Blog uses its own get_db from src.blog.deps — both get_db and get_current_user
must be overridden separately.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.blog.deps import get_db
from src.auth.dependencies import get_current_user
from src.blog.models import Post, Comment
from src.auth.models import User


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user_model(role: str = "user") -> User:
    """Return a real User SQLAlchemy instance (required for relationship assignments)."""
    user = User(
        username="testuser",
        email="test@example.com",
        password_hash="$2b$12$dummy",
        is_verified=True,
    )
    user.id = uuid.uuid4()
    user.role = role
    user.avatar_url = None
    user.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    user.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return user


def _make_user_mock():
    """Lightweight MagicMock for current_user dependency (no ORM assignment)."""
    user = MagicMock()
    user.id = uuid.uuid4()
    user.username = "testuser"
    user.email = "test@example.com"
    user.role = "user"
    return user


def _make_post(author: User, title: str = "Test Post") -> Post:
    p = Post(title=title, content="Some content here.", author_id=author.id)
    p.id = uuid.uuid4()
    p.is_published = True
    p.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    p.author = author   # real User instance — SQLAlchemy relationship is satisfied
    p.comments = []
    return p


def _make_comment(post_id: uuid.UUID, author: User) -> Comment:
    c = Comment(content="Nice post!", post_id=post_id, author_id=author.id)
    c.id = uuid.uuid4()
    c.parent_id = None
    c.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    c.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    c.author = author
    return c


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ── GET /blog/posts ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_posts_returns_200(async_client):
    author = _make_user_model()
    post = _make_post(author)
    db = AsyncMock()

    result = MagicMock()
    result.scalars.return_value.all.return_value = [post]
    db.execute = AsyncMock(return_value=result)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db

    async with async_client as client:
        resp = await client.get("/blog/posts")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert len(resp.json()) == 1
    assert resp.json()[0]["title"] == "Test Post"


# ── POST /blog/posts ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_post_authenticated_returns_201(async_client):
    author = _make_user_model()
    current_user = _make_user_mock()
    current_user.id = author.id  # align IDs so router uses the same user_id
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    created_post = _make_post(author, title="New Post")
    result = MagicMock()
    result.scalar_one.return_value = created_post
    db.execute = AsyncMock(return_value=result)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: current_user

    async with async_client as client:
        resp = await client.post("/blog/posts", json={
            "title": "New Post",
            "content": "This is the post content.",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["title"] == "New Post"


@pytest.mark.asyncio
async def test_create_post_unauthenticated_returns_401(async_client):
    async def override_db():
        yield AsyncMock()

    app.dependency_overrides[get_db] = override_db
    # No get_current_user override → no token → 401

    async with async_client as client:
        resp = await client.post("/blog/posts", json={
            "title": "Unauthorized Post",
            "content": "Should not be created.",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 401


# ── GET /blog/posts/{post_id} ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_single_post_returns_200(async_client):
    author = _make_user_model()
    post = _make_post(author)
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = post
    db.execute = AsyncMock(return_value=result)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db

    async with async_client as client:
        resp = await client.get(f"/blog/posts/{post.id}")

    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["title"] == "Test Post"


@pytest.mark.asyncio
async def test_get_nonexistent_post_returns_404(async_client):
    db = AsyncMock()

    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db

    async with async_client as client:
        resp = await client.get(f"/blog/posts/{uuid.uuid4()}")

    app.dependency_overrides.clear()

    assert resp.status_code == 404


# ── POST /blog/posts/{post_id}/comments ──────────────────────────────────────

@pytest.mark.asyncio
async def test_add_comment_to_post_returns_201(async_client):
    author = _make_user_model()
    current_user = _make_user_mock()
    current_user.id = author.id
    post = _make_post(author)
    comment = _make_comment(post.id, author)
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()

    db.get = AsyncMock(return_value=post)

    comment_result = MagicMock()
    comment_result.scalar_one.return_value = comment
    db.execute = AsyncMock(return_value=comment_result)

    async def override_db():
        yield db

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: current_user

    async with async_client as client:
        resp = await client.post(f"/blog/posts/{post.id}/comments", json={
            "content": "Great article!",
        })

    app.dependency_overrides.clear()

    assert resp.status_code == 201
    assert resp.json()["content"] == "Nice post!"

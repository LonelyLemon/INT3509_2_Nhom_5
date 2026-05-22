"""
Integration tests for /ai router — conversation history, CRUD, chat SSE.

All DB and AI agents are mocked — no live infrastructure needed.
Tests focus on: message history persistence, history loading for follow-up
turns, conversation CRUD, content policy enforcement, and error rollback.
"""
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest
from httpx import AsyncClient, ASGITransport

from src.main import app
from src.core.database import get_session
from src.auth.dependencies import get_current_user
from src.ai.models import Conversation, Message
from src.ai.router import _build_message_history
from src.ai.agents.intent_agent import IntentResult
from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart, TextPart


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.role = "user"
    return user


def _make_conversation(user_id: uuid.UUID, title: str = "Test conv") -> Conversation:
    conv = MagicMock(spec=Conversation)
    conv.id = uuid.uuid4()
    conv.user_id = user_id
    conv.title = title
    conv.rating = None
    conv.feedback_text = None
    conv.rated_at = None
    conv.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    conv.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return conv


def _make_message(conv_id: uuid.UUID, role: str, content: str) -> Message:
    msg = MagicMock(spec=Message)
    msg.id = uuid.uuid4()
    msg.conversation_id = conv_id
    msg.role = role
    msg.content = content
    msg.created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    msg.updated_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    return msg


def _parse_sse_events(content: bytes) -> list[dict]:
    """Parse raw SSE bytes into list of {event, data} dicts."""
    text = content.decode()
    events = []
    for block in text.strip().split("\n\n"):
        event_type = None
        data = None
        for line in block.strip().split("\n"):
            if line.startswith("event: "):
                event_type = line[7:]
            elif line.startswith("data: "):
                data = json.loads(line[6:])
        if event_type:
            events.append({"event": event_type, "data": data})
    return events


def _make_db_empty() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    return db


def _make_intent_mock(intent: str = "general", tickers: list[str] | None = None):
    """Return a mock intent agent whose run() returns an IntentResult."""
    intent_result = IntentResult(intent=intent, tickers=tickers or [], language="vi")
    run_result = MagicMock()
    run_result.output = intent_result

    agent = MagicMock()
    agent.run = AsyncMock(return_value=run_result)
    return agent


def _make_streaming_agent(tokens: list[str] | None = None):
    """Return a mock specialized agent with run_stream() async context manager."""
    tokens = tokens or ["Xin ", "chào!"]

    async def fake_stream_text(*, delta=False):
        for t in tokens:
            yield t

    stream_result = MagicMock()
    stream_result.stream_text = fake_stream_text
    stream_result.new_messages = MagicMock(return_value=[])

    @asynccontextmanager
    async def fake_run_stream(*args, **kwargs):
        yield stream_result

    agent = MagicMock()
    agent.run_stream = fake_run_stream
    return agent


def _session_override(db: AsyncMock):
    """Return an async generator function that yields the mock db session."""
    async def _gen():
        yield db
    return _gen


@pytest.fixture
def async_client():
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


# ══════════════════════════════════════════════════════════════════════════════
# Unit: _build_message_history
# ══════════════════════════════════════════════════════════════════════════════

class TestBuildMessageHistory:
    def test_empty_list_returns_empty(self):
        assert _build_message_history([]) == []

    def test_user_message_becomes_model_request(self):
        msg = _make_message(uuid.uuid4(), "user", "Xin chào")
        history = _build_message_history([msg])

        assert len(history) == 1
        assert isinstance(history[0], ModelRequest)
        assert isinstance(history[0].parts[0], UserPromptPart)
        assert history[0].parts[0].content == "Xin chào"

    def test_assistant_message_becomes_model_response(self):
        msg = _make_message(uuid.uuid4(), "assistant", "Tôi là AI trợ lý.")
        history = _build_message_history([msg])

        assert len(history) == 1
        assert isinstance(history[0], ModelResponse)
        assert isinstance(history[0].parts[0], TextPart)
        assert history[0].parts[0].content == "Tôi là AI trợ lý."

    def test_unknown_role_is_skipped(self):
        """Messages with roles other than user/assistant are silently skipped."""
        msg = _make_message(uuid.uuid4(), "system", "You are an AI.")
        history = _build_message_history([msg])
        assert history == []

    def test_alternating_conversation_preserves_order(self):
        conv_id = uuid.uuid4()
        messages = [
            _make_message(conv_id, "user", "Giá VNM hôm nay?"),
            _make_message(conv_id, "assistant", "VNM hiện tại là 75.000 VND."),
            _make_message(conv_id, "user", "So với tuần trước thế nào?"),
            _make_message(conv_id, "assistant", "Giảm 2% so với tuần trước."),
        ]
        history = _build_message_history(messages)

        assert len(history) == 4
        assert isinstance(history[0], ModelRequest)
        assert history[0].parts[0].content == "Giá VNM hôm nay?"
        assert isinstance(history[1], ModelResponse)
        assert history[1].parts[0].content == "VNM hiện tại là 75.000 VND."
        assert isinstance(history[2], ModelRequest)
        assert history[2].parts[0].content == "So với tuần trước thế nào?"
        assert isinstance(history[3], ModelResponse)
        assert history[3].parts[0].content == "Giảm 2% so với tuần trước."

    def test_user_only_messages(self):
        messages = [
            _make_message(uuid.uuid4(), "user", "Câu hỏi 1"),
            _make_message(uuid.uuid4(), "user", "Câu hỏi 2"),
        ]
        history = _build_message_history(messages)
        assert len(history) == 2
        assert all(isinstance(h, ModelRequest) for h in history)

    def test_message_content_preserved_exactly(self):
        content = "Phân tích kỹ thuật VNM: RSI, MACD, Bollinger Bands?"
        msg = _make_message(uuid.uuid4(), "user", content)
        history = _build_message_history([msg])
        assert history[0].parts[0].content == content


# ══════════════════════════════════════════════════════════════════════════════
# Integration: Conversation CRUD
# ══════════════════════════════════════════════════════════════════════════════

class TestListConversations:
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_conversations(self, async_client):
        user = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.get("/ai/conversations")

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json() == []

    @pytest.mark.asyncio
    async def test_returns_conversations_list(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id, title="Câu hỏi về VNM")
        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.all.return_value = [conv]
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.get("/ai/conversations")

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 1
        assert body[0]["id"] == str(conv.id)
        assert body[0]["title"] == "Câu hỏi về VNM"

    @pytest.mark.asyncio
    async def test_requires_authentication(self, async_client):
        async with async_client as client:
            resp = await client.get("/ai/conversations")
        assert resp.status_code == 401


class TestGetConversation:
    @pytest.mark.asyncio
    async def test_returns_conversation_with_messages(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id, title="Test conv")
        msg1 = _make_message(conv.id, "user", "Xin chào")
        msg2 = _make_message(conv.id, "assistant", "Xin chào! Tôi có thể giúp gì?")
        conv.messages = [msg1, msg2]

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.get(f"/ai/conversations/{conv.id}")

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == str(conv.id)
        assert len(body["messages"]) == 2
        assert body["messages"][0]["role"] == "user"
        assert body["messages"][0]["content"] == "Xin chào"
        assert body["messages"][1]["role"] == "assistant"
        assert body["messages"][1]["content"] == "Xin chào! Tôi có thể giúp gì?"

    @pytest.mark.asyncio
    async def test_returns_404_for_missing_conversation(self, async_client):
        user = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.get(f"/ai/conversations/{uuid.uuid4()}")

        app.dependency_overrides.clear()
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_returns_conversation_with_no_messages(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id)
        conv.messages = []

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.get(f"/ai/conversations/{conv.id}")

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json()["messages"] == []


class TestRenameConversation:
    @pytest.mark.asyncio
    async def test_rename_updates_title(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id, title="Tên cũ")

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)
        db.commit = AsyncMock()
        db.refresh = AsyncMock(side_effect=lambda obj: setattr(obj, "title", "Tên mới"))

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.patch(
                f"/ai/conversations/{conv.id}",
                json={"title": "Tên mới"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json()["title"] == "Tên mới"

    @pytest.mark.asyncio
    async def test_rename_returns_404_for_missing(self, async_client):
        user = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.patch(
                f"/ai/conversations/{uuid.uuid4()}",
                json={"title": "Tên mới"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_rename_rejects_empty_title(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.patch(
                f"/ai/conversations/{uuid.uuid4()}",
                json={"title": ""},
            )

        app.dependency_overrides.clear()
        # app uses a custom handler that maps RequestValidationError → 400
        assert resp.status_code == 400


class TestDeleteConversation:
    @pytest.mark.asyncio
    async def test_delete_returns_204(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id)

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)
        db.delete = AsyncMock()
        db.commit = AsyncMock()

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.delete(f"/ai/conversations/{conv.id}")

        app.dependency_overrides.clear()
        assert resp.status_code == 204
        db.delete.assert_awaited_once_with(conv)
        db.commit.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_delete_returns_404_for_missing(self, async_client):
        user = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.delete(f"/ai/conversations/{uuid.uuid4()}")

        app.dependency_overrides.clear()
        assert resp.status_code == 404


class TestConversationFeedback:
    @pytest.mark.asyncio
    async def test_like_feedback_saved(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id)

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)
        db.commit = AsyncMock()

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.post(
                f"/ai/conversations/{conv.id}/feedback",
                json={"rating": "like"},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert resp.json()["rating"] == "like"
        assert conv.rating == "like"

    @pytest.mark.asyncio
    async def test_dislike_with_text_saved(self, async_client):
        user = _make_user()
        conv = _make_conversation(user.id)

        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = conv
        db.execute = AsyncMock(return_value=result)
        db.commit = AsyncMock()

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.post(
                f"/ai/conversations/{conv.id}/feedback",
                json={"rating": "dislike", "feedback_text": "Câu trả lời chưa chính xác."},
            )

        app.dependency_overrides.clear()
        assert resp.status_code == 200
        assert conv.rating == "dislike"
        assert conv.feedback_text == "Câu trả lời chưa chính xác."

    @pytest.mark.asyncio
    async def test_invalid_rating_rejected(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.post(
                f"/ai/conversations/{uuid.uuid4()}/feedback",
                json={"rating": "neutral"},
            )

        app.dependency_overrides.clear()
        # app uses a custom handler that maps RequestValidationError → 400
        assert resp.status_code == 400


# ══════════════════════════════════════════════════════════════════════════════
# Integration: POST /ai/chat — SSE streaming
# ══════════════════════════════════════════════════════════════════════════════

class TestChatSSE:
    def _setup_db_for_new_conv(self) -> AsyncMock:
        """DB mock for a brand-new conversation (no prior messages)."""
        db = AsyncMock()
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        db.rollback = AsyncMock()
        return db

    def _setup_db_for_existing_conv(
        self,
        conv: Conversation,
        prior_msgs: list[Message],
    ) -> AsyncMock:
        """DB mock for an existing conversation with prior messages."""
        db = AsyncMock()

        conv_result = MagicMock()
        conv_result.scalar_one_or_none.return_value = conv

        msgs_result = MagicMock()
        msgs_result.scalars.return_value.all.return_value = prior_msgs

        db.execute = AsyncMock(side_effect=[conv_result, msgs_result])
        db.add = MagicMock()
        db.flush = AsyncMock()
        db.commit = AsyncMock()
        db.rollback = AsyncMock()
        return db

    @pytest.mark.asyncio
    async def test_new_conversation_creates_conversation_and_saves_messages(
        self, async_client
    ):
        user = _make_user()
        db = self._setup_db_for_new_conv()

        intent_agent = _make_intent_mock(intent="general")
        guide_agent = _make_streaming_agent(tokens=["Xin ", "chào!"])

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with (
            patch("src.ai.router.get_intent_agent", return_value=intent_agent),
            patch("src.ai.router.get_guide_agent", return_value=guide_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={"message": "Xin chào"},
                )

        app.dependency_overrides.clear()

        assert resp.status_code == 200
        events = _parse_sse_events(resp.content)

        # Should have: routing, token(s), done
        event_types = [e["event"] for e in events]
        assert "routing" in event_types
        assert "token" in event_types
        assert "done" in event_types
        assert "error" not in event_types

        # Routing event should have intent info
        routing = next(e for e in events if e["event"] == "routing")
        assert routing["data"]["intent"] == "general"

        # Tokens should reconstruct the full response
        tokens = [e["data"]["text"] for e in events if e["event"] == "token"]
        assert "".join(tokens) == "Xin chào!"

        # DB: flush called to persist new conversation, then commit for messages
        db.flush.assert_awaited_once()
        db.commit.assert_awaited_once()

        # DB: add called at least 2 times (user msg + assistant msg)
        add_calls = db.add.call_args_list
        assert len(add_calls) >= 2

        # Verify user message and assistant message are saved
        added_objects = [c.args[0] for c in add_calls]
        user_msgs = [o for o in added_objects if isinstance(o, Message) and o.role == "user"]
        asst_msgs = [o for o in added_objects if isinstance(o, Message) and o.role == "assistant"]
        assert len(user_msgs) == 1
        assert user_msgs[0].content == "Xin chào"
        assert len(asst_msgs) == 1
        assert asst_msgs[0].content == "Xin chào!"

    @pytest.mark.asyncio
    async def test_existing_conversation_loads_prior_messages_as_history(
        self, async_client
    ):
        user = _make_user()
        conv = _make_conversation(user.id, title="Cuộc hội thoại cũ")

        prior_msgs = [
            _make_message(conv.id, "user", "VNM giá bao nhiêu?"),
            _make_message(conv.id, "assistant", "VNM hiện tại là 75.000 VND."),
        ]

        db = self._setup_db_for_existing_conv(conv, prior_msgs)

        captured_history = []

        async def fake_run_stream(*args, message_history=None, **kwargs):
            captured_history.extend(message_history or [])

            async def _gen():
                async def stream_text(*, delta=False):
                    yield "So với tuần trước giảm 2%."

                result = MagicMock()
                result.stream_text = stream_text
                result.new_messages = MagicMock(return_value=[])
                yield result

        @asynccontextmanager
        async def fake_ctx(*args, message_history=None, deps=None, **kwargs):
            captured_history.extend(message_history or [])

            async def stream_text(*, delta=False):
                yield "So với tuần trước giảm 2%."

            result = MagicMock()
            result.stream_text = stream_text
            result.new_messages = MagicMock(return_value=[])
            yield result

        guide_agent = MagicMock()
        guide_agent.run_stream = fake_ctx
        intent_agent = _make_intent_mock(intent="market_data")

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with (
            patch("src.ai.router.get_intent_agent", return_value=intent_agent),
            patch("src.ai.router.get_data_agent", return_value=guide_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={
                        "message": "So với tuần trước thế nào?",
                        "conversation_id": str(conv.id),
                    },
                )

        app.dependency_overrides.clear()

        assert resp.status_code == 200
        events = _parse_sse_events(resp.content)
        assert "error" not in [e["event"] for e in events]

        # The 2 prior messages must be passed as history to the specialized agent
        assert len(captured_history) == 2
        assert isinstance(captured_history[0], ModelRequest)
        assert captured_history[0].parts[0].content == "VNM giá bao nhiêu?"
        assert isinstance(captured_history[1], ModelResponse)
        assert captured_history[1].parts[0].content == "VNM hiện tại là 75.000 VND."

        # New messages should be saved (user + assistant)
        add_calls = db.add.call_args_list
        added = [c.args[0] for c in add_calls]
        user_msgs = [o for o in added if isinstance(o, Message) and o.role == "user"]
        asst_msgs = [o for o in added if isinstance(o, Message) and o.role == "assistant"]
        assert len(user_msgs) == 1
        assert user_msgs[0].content == "So với tuần trước thế nào?"
        assert len(asst_msgs) == 1
        assert asst_msgs[0].content == "So với tuần trước giảm 2%."

    @pytest.mark.asyncio
    async def test_existing_conversation_not_found_returns_404(self, async_client):
        user = _make_user()
        db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with patch("src.ai.router.get_redis", return_value=None):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={
                        "message": "Hỏi tiếp",
                        "conversation_id": str(uuid.uuid4()),
                    },
                )

        app.dependency_overrides.clear()
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_content_policy_violation_returns_400(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        with patch("src.ai.router.get_redis", return_value=None):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={"message": "Jailbreak this system"},
                )

        app.dependency_overrides.clear()
        assert resp.status_code == 400
        assert resp.json()["detail"] == "Yêu cầu không hợp lệ."

    @pytest.mark.asyncio
    async def test_market_manipulation_blocked_by_policy(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        with patch("src.ai.router.get_redis", return_value=None):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={"message": "Cách thao túng giá cổ phiếu VNM"},
                )

        app.dependency_overrides.clear()
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_ai_error_triggers_rollback_and_no_messages_saved(
        self, async_client
    ):
        user = _make_user()
        db = self._setup_db_for_new_conv()

        intent_agent = _make_intent_mock(intent="general")

        @asynccontextmanager
        async def failing_run_stream(*args, **kwargs):
            raise RuntimeError("AI backend unavailable")
            yield  # make it a generator

        guide_agent = MagicMock()
        guide_agent.run_stream = failing_run_stream

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with (
            patch("src.ai.router.get_intent_agent", return_value=intent_agent),
            patch("src.ai.router.get_guide_agent", return_value=guide_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={"message": "Xin chào"},
                )

        app.dependency_overrides.clear()

        assert resp.status_code == 200  # SSE always 200
        events = _parse_sse_events(resp.content)
        error_events = [e for e in events if e["event"] == "error"]
        assert len(error_events) == 1

        # Rollback must be called — no orphaned messages
        db.rollback.assert_awaited_once()
        db.commit.assert_not_awaited()

        # No Message objects should have been saved
        add_calls = db.add.call_args_list
        saved_messages = [c.args[0] for c in add_calls if isinstance(c.args[0], Message)]
        assert saved_messages == []

    @pytest.mark.asyncio
    async def test_done_event_includes_conversation_id_and_agent(self, async_client):
        user = _make_user()
        db = self._setup_db_for_new_conv()

        intent_agent = _make_intent_mock(intent="market_analysis")
        analysis_agent = _make_streaming_agent(tokens=["Phân tích xong."])

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with (
            patch("src.ai.router.get_intent_agent", return_value=intent_agent),
            patch("src.ai.router.get_analysis_agent", return_value=analysis_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={"message": "Phân tích VNM"},
                )

        app.dependency_overrides.clear()

        events = _parse_sse_events(resp.content)
        done = next((e for e in events if e["event"] == "done"), None)
        assert done is not None
        assert "conversation_id" in done["data"]
        assert done["data"]["agent"] == "market_analysis"

    @pytest.mark.asyncio
    async def test_empty_message_rejected(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.post("/ai/chat", json={"message": ""})

        app.dependency_overrides.clear()
        # app uses a custom handler that maps RequestValidationError → 400
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_message_too_long_rejected(self, async_client):
        user = _make_user()
        app.dependency_overrides[get_current_user] = lambda: user

        async with async_client as client:
            resp = await client.post("/ai/chat", json={"message": "A" * 4001})

        app.dependency_overrides.clear()
        # app uses a custom handler that maps RequestValidationError → 400
        assert resp.status_code == 400

    @pytest.mark.asyncio
    async def test_title_truncated_to_60_chars_for_long_message(self, async_client):
        user = _make_user()
        db = self._setup_db_for_new_conv()

        intent_agent = _make_intent_mock(intent="general")
        guide_agent = _make_streaming_agent(tokens=["OK"])

        long_message = "Đây là một câu hỏi rất dài để kiểm tra truncate title feature của conversation"

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        created_convs = []
        original_add = db.add.side_effect

        def capture_add(obj):
            if isinstance(obj, Conversation):
                created_convs.append(obj)

        db.add.side_effect = capture_add

        with (
            patch("src.ai.router.get_intent_agent", return_value=intent_agent),
            patch("src.ai.router.get_guide_agent", return_value=guide_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                await client.post("/ai/chat", json={"message": long_message})

        app.dependency_overrides.clear()

        # Conversation title must be at most 60 characters
        assert len(created_convs) == 1
        assert len(created_convs[0].title) <= 60
        assert created_convs[0].title == long_message[:60]

    @pytest.mark.asyncio
    async def test_follow_up_uses_recent_history_for_intent_classification(
        self, async_client
    ):
        """Short follow-ups like 'OK' must pass recent history to intent agent."""
        user = _make_user()
        conv = _make_conversation(user.id)
        prior_msgs = [
            _make_message(conv.id, "user", "Thêm VNM vào watchlist"),
            _make_message(conv.id, "assistant", "Xác nhận thêm VNM?"),
        ]

        db = self._setup_db_for_existing_conv(conv, prior_msgs)

        # Capture what history the intent agent receives
        intent_history_received = []

        original_run = None

        class CapturingIntentAgent:
            async def run(self, message, message_history=None):
                intent_history_received.extend(message_history or [])
                result = MagicMock()
                result.output = IntentResult(
                    intent="market_analysis", tickers=["VNM"], language="vi"
                )
                return result

        capturing_intent = CapturingIntentAgent()

        @asynccontextmanager
        async def stub_stream(*args, **kwargs):
            async def st(*, delta=False):
                yield "Đã thêm VNM vào watchlist."
            r = MagicMock()
            r.stream_text = st
            r.new_messages = MagicMock(return_value=[])
            yield r

        analysis_agent = MagicMock()
        analysis_agent.run_stream = stub_stream

        app.dependency_overrides[get_session] = _session_override(db)
        app.dependency_overrides[get_current_user] = lambda: user

        with (
            patch("src.ai.router.get_intent_agent", return_value=capturing_intent),
            patch("src.ai.router.get_analysis_agent", return_value=analysis_agent),
            patch("src.ai.router.get_redis", return_value=None),
        ):
            async with async_client as client:
                resp = await client.post(
                    "/ai/chat",
                    json={
                        "message": "Xác nhận",
                        "conversation_id": str(conv.id),
                    },
                )

        app.dependency_overrides.clear()

        assert resp.status_code == 200
        events = _parse_sse_events(resp.content)
        assert "error" not in [e["event"] for e in events]

        # Intent agent must have received prior messages for context
        # (up to last 4 turns = classification_history[-4:])
        assert len(intent_history_received) == 2
        assert intent_history_received[0].parts[0].content == "Thêm VNM vào watchlist"
        assert intent_history_received[1].parts[0].content == "Xác nhận thêm VNM?"

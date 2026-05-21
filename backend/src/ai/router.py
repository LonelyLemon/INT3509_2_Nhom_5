import json
import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from loguru import logger
from pydantic_ai import exceptions as pai_exceptions
from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart, TextPart

from src.auth.dependencies import get_current_user, get_admin_user
from src.auth.models import User
from src.core.database import SessionDep
from src.core.redis import get_redis
from src.core.config import settings
from src.ai.agent import (
    AgentDeps,
    get_intent_agent,
    get_guide_agent,
    get_data_agent,
    get_analysis_agent,
    get_advisor_agent,
)
from src.ai.models import Conversation, Message
from src.ai.schemas import (
    ChatRequest,
    ConversationResponse,
    ConversationDetailResponse,
    MessageResponse,
    ConversationUpdate,
    ConversationFeedbackRequest,
    AIAdminStats,
    RecentFeedbackItem,
)
from src.ai.exceptions import ConversationNotFound, AIRateLimitExceeded, AIServiceUnavailable, AIContentPolicyViolation
from src.ai.guardrails import check_input_policy

ai_route = APIRouter(prefix="/ai", tags=["AI"])

# Per-user AI rate limit: 20 queries per 60 seconds
_AI_RATE_LIMIT = 20
_AI_RATE_WINDOW = 60

_AGENT_LABELS = {
    "app_guide": "Trợ lý Hướng dẫn",
    "market_data": "Trợ lý Dữ liệu thị trường",
    "market_analysis": "Trợ lý Phân tích thị trường",
    "investment_advice": "Trợ lý Tư vấn Đầu tư",
    "general": "Trợ lý Hướng dẫn",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _check_ai_rate_limit(user_id: UUID) -> None:
    redis = get_redis()
    if redis is None:
        return
    key = f"ai_rate:{user_id}"
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, _AI_RATE_WINDOW)
    if count > _AI_RATE_LIMIT:
        ttl = await redis.ttl(key)
        raise AIRateLimitExceeded(retry_after=max(ttl, 1))


async def _get_conversation_or_404(
    db: SessionDep, conversation_id: UUID, user_id: UUID
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise ConversationNotFound()
    return conv


def _build_message_history(messages: list[Message]) -> list:
    """Convert DB messages to pydantic-ai ModelMessage history."""
    history = []
    for msg in messages:
        if msg.role == "user":
            history.append(ModelRequest(parts=[UserPromptPart(content=msg.content)]))
        elif msg.role == "assistant":
            history.append(ModelResponse(parts=[TextPart(content=msg.content)]))
    return history


def _select_agent(intent: str):
    """Map intent to the appropriate specialized agent."""
    if intent == "market_analysis":
        return get_analysis_agent()
    if intent == "market_data":
        return get_data_agent()
    if intent == "investment_advice":
        return get_advisor_agent()
    # app_guide and general both go to guide agent
    return get_guide_agent()


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ── SSE Chat ──────────────────────────────────────────────────────────────────

@ai_route.post("/chat")
async def chat(
    payload: ChatRequest,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """
    Stream an AI response via SSE (Server-Sent Events).

    SSE events emitted:
    - `routing`  — intent classification result, which agent will handle the request
    - `token`    — incremental text delta
    - `tool`     — tool being called (name)
    - `done`     — stream complete, includes conversation_id and agent used
    - `error`    — error message
    """
    check_input_policy(payload.message)
    await _check_ai_rate_limit(current_user.id)

    # Resolve or create conversation
    if payload.conversation_id:
        conversation = await _get_conversation_or_404(db, payload.conversation_id, current_user.id)
        msgs_result = await db.execute(
            select(Message)
            .where(Message.conversation_id == conversation.id)
            .order_by(Message.created_at)
        )
        prior_messages = msgs_result.scalars().all()
    else:
        conversation = Conversation(user_id=current_user.id, title=payload.message[:60])
        db.add(conversation)
        await db.flush()
        prior_messages = []

    message_history = _build_message_history(list(prior_messages))

    async def event_stream():
        full_response = ""
        tool_names: list[str] = []
        routed_intent = "general"
        # Capture user_id early — db.rollback() expires ORM objects, making
        # attribute access fail with MissingGreenlet in async context.
        user_id = current_user.id

        try:
            deps = AgentDeps(db=db, user_id=user_id)

            # ── Phase 1: Classify intent (no streaming, fast ~1s) ────────────
            # For follow-up turns, pass recent history so the intent agent
            # can correctly classify short continuation messages like
            # "Xác nhận", "100 cổ", "OK" in context of an ongoing operation.
            classification_history = message_history[-4:] if message_history else None
            intent_result = await get_intent_agent().run(
                payload.message,
                message_history=classification_history,
            )
            intent = intent_result.output
            routed_intent = intent.intent

            yield _sse("routing", {
                "intent": intent.intent,
                "agent_name": _AGENT_LABELS.get(intent.intent, "Trợ lý AI"),
                "tickers": intent.tickers,
            })

            # ── Phase 2: Route to specialized agent (streaming) ──────────────
            target_agent = _select_agent(intent.intent)

            async with target_agent.run_stream(
                payload.message,
                deps=deps,
                message_history=message_history,
            ) as result:
                async for delta in result.stream_text(delta=True):
                    full_response += delta
                    yield _sse("token", {"text": delta})

                # Collect tool calls from new messages for transparency
                for msg in result.new_messages():
                    if isinstance(msg, ModelResponse):
                        for part in msg.parts:
                            if hasattr(part, "tool_name"):
                                name = part.tool_name
                                if name not in tool_names:
                                    tool_names.append(name)

            # Persist user message + assistant response
            db.add(Message(
                conversation_id=conversation.id,
                role="user",
                content=payload.message,
            ))
            db.add(Message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
            ))
            await db.commit()

            yield _sse("done", {
                "conversation_id": str(conversation.id),
                "tools_used": tool_names,
                "agent": routed_intent,
            })

        except AIRateLimitExceeded as e:
            await db.rollback()
            yield _sse("error", {"detail": e.detail})
        except RuntimeError as e:
            await db.rollback()
            logger.error(f"AI RuntimeError for user {user_id}: {e}")
            yield _sse("error", {"detail": str(e)})
        except pai_exceptions.UserError as e:
            # pydantic-ai configuration error (e.g. wrong agent kwarg)
            await db.rollback()
            logger.error(f"pydantic-ai UserError: {e}")
            yield _sse("error", {"detail": f"AI configuration error: {e}"})
        except pai_exceptions.AgentRunError as e:
            await db.rollback()
            logger.error(f"pydantic-ai AgentRunError for user {user_id}: {e}")
            yield _sse("error", {"detail": "AI service error. Please try again."})
        except Exception as e:
            await db.rollback()
            logger.exception(f"Unexpected AI error for user {user_id}: {e}")
            yield _sse("error", {"detail": "An unexpected error occurred."})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# ── Conversation CRUD ─────────────────────────────────────────────────────────

@ai_route.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@ai_route.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise ConversationNotFound()
    return conv


@ai_route.patch("/conversations/{conversation_id}", response_model=ConversationResponse)
async def rename_conversation(
    conversation_id: UUID,
    payload: ConversationUpdate,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    conv = await _get_conversation_or_404(db, conversation_id, current_user.id)
    conv.title = payload.title
    await db.commit()
    await db.refresh(conv)
    return conv


@ai_route.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    conv = await _get_conversation_or_404(db, conversation_id, current_user.id)
    await db.delete(conv)
    await db.commit()


# ── Feedback ──────────────────────────────────────────────────────────────────

@ai_route.post("/conversations/{conversation_id}/feedback", status_code=200)
async def rate_conversation(
    conversation_id: UUID,
    payload: ConversationFeedbackRequest,
    db: SessionDep,
    current_user: User = Depends(get_current_user),
):
    """User rates a conversation like/dislike with optional feedback text."""
    conv = await _get_conversation_or_404(db, conversation_id, current_user.id)
    conv.rating = payload.rating
    conv.feedback_text = payload.feedback_text
    conv.rated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"message": "Feedback recorded.", "rating": conv.rating}


# ── Admin Stats ───────────────────────────────────────────────────────────────

@ai_route.get("/admin/stats", response_model=AIAdminStats)
async def get_ai_admin_stats(
    db: SessionDep,
    _admin: User = Depends(get_admin_user),
):
    """Admin-only: aggregate feedback stats for all AI conversations."""
    total = (await db.execute(select(func.count()).select_from(Conversation))).scalar_one()
    like_count = (
        await db.execute(
            select(func.count()).select_from(Conversation).where(Conversation.rating == "like")
        )
    ).scalar_one()
    dislike_count = (
        await db.execute(
            select(func.count()).select_from(Conversation).where(Conversation.rating == "dislike")
        )
    ).scalar_one()
    unrated = total - like_count - dislike_count

    rated = like_count + dislike_count
    like_rate = round(like_count / rated * 100, 1) if rated else 0.0
    dislike_rate = round(dislike_count / rated * 100, 1) if rated else 0.0

    recent_rows = (
        await db.execute(
            select(Conversation)
            .where(Conversation.rating.isnot(None))
            .order_by(Conversation.rated_at.desc())
            .limit(20)
        )
    ).scalars().all()

    return AIAdminStats(
        total_conversations=total,
        like_count=like_count,
        dislike_count=dislike_count,
        unrated_count=unrated,
        like_rate_pct=like_rate,
        dislike_rate_pct=dislike_rate,
        recent_feedback=[RecentFeedbackItem.model_validate(r) for r in recent_rows],
    )

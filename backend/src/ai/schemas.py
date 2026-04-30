from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: UUID | None = None


# ── Message ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    created_at: datetime


# ── Conversation ─────────────────────────────────────────────────────────────

class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class ConversationDetailResponse(ConversationResponse):
    messages: list[MessageResponse]


class ConversationUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=256)

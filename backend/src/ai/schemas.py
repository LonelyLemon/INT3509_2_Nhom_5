from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


# ── Chat ─────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Phân tích kỹ thuật VNM cho tôi",
                "conversation_id": None,
            }
        }
    )

    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: UUID | None = Field(
        default=None,
        description="ID của conversation cũ. Để null để tạo conversation mới.",
    )


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

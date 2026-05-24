from uuid import UUID
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class UserOut(BaseModel):
    id: UUID
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    title: str
    content: str


class PostOut(BaseModel):
    id: UUID
    title: str
    content: str
    author_id: UUID          # needed by frontend for ownership check
    is_published: bool
    created_at: datetime
    updated_at: datetime
    author: UserOut

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[UUID] = None


class CommentOut(BaseModel):
    id: UUID
    content: str
    post_id: UUID
    author_id: UUID          # needed by frontend for ownership check
    parent_id: Optional[UUID] = None   # needed for threaded replies
    created_at: datetime
    updated_at: datetime
    author: UserOut

    class Config:
        from_attributes = True
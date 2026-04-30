from uuid import UUID
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class UserOut(BaseModel):
    id: UUID
    username: str

    class Config:
        from_attributes = True


class PostCreate(BaseModel):
    title: str
    content: str


class PostOut(BaseModel):
    id: UUID
    title: str
    content: str
    created_at: datetime
    author: UserOut

    class Config:
        from_attributes = True


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[UUID] = None


class CommentOut(BaseModel):
    id: UUID
    content: str
    created_at: datetime
    author: UserOut

    class Config:
        from_attributes = True
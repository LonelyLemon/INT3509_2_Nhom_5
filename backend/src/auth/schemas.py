from uuid import UUID
from typing import Optional
from datetime import datetime
from pydantic import (BaseModel, EmailStr, 
                      Field, field_validator)


class UserResponse(BaseModel):
    id: UUID
    username: str = Field(..., description="User's username")
    email: EmailStr = Field(..., description="User's email")
    is_verified: bool = Field(..., description="User's status (Verified=True/Unverified=False)")
    role: str = Field("user", description="User's role (admin/user)")
    display_name: str | None = Field(None, description="User's display name")
    avatar_url: str | None = Field(None, description="User's avatar URL")
    bio: str | None = Field(None, description="User's bio")
    created_at: datetime = Field(..., description="Time of user creation")
    updated_at: datetime = Field(..., description="Latest user's update datetime")

class UserCreate(BaseModel):
    username: str = Field(..., description="User's username")
    email: EmailStr = Field(..., description="User's email")
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class ForgetPasswordRequest(BaseModel):
    email: EmailStr

class UserPublicProfile(BaseModel):
    id: UUID
    username: str = Field(..., description="User's username")
    display_name: str | None = Field(None, description="User's display name")
    avatar_url: str | None = Field(None, description="User's avatar URL")
    bio: str | None = Field(None, description="User's bio")
    created_at: datetime = Field(..., description="Time of user creation")

class ResendVerificationRequest(BaseModel):
    email: EmailStr
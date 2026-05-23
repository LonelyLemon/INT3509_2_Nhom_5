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

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

_MAX_AVATAR_BYTES = 2 * 1024 * 1024  # 2 MB


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

    @field_validator('avatar_url')
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v.encode('utf-8')) > _MAX_AVATAR_BYTES:
            raise ValueError('Avatar quá lớn. Vui lòng chọn ảnh nhỏ hơn 2MB.')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class ForgetPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        return v

class RefreshRequest(BaseModel):
    refresh_token: str

class UserPublicProfile(BaseModel):
    id: UUID
    username: str = Field(..., description="User's username")
    display_name: str | None = Field(None, description="User's display name")
    avatar_url: str | None = Field(None, description="User's avatar URL")
    bio: str | None = Field(None, description="User's bio")
    created_at: datetime = Field(..., description="Time of user creation")

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class UserAdminResponse(BaseModel):
    id: UUID
    username: str
    email: EmailStr
    role: str
    is_verified: bool
    is_banned: bool
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    role: str = Field(..., pattern="^(admin|user)$", description="New role: admin or user")
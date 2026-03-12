from sqlalchemy import String, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column

from src.core.base_model import Base


class User(Base):
    __tablename__ = 'users'

    username: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(20), default="user")  # admin | user
    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_banned: Mapped[bool] = mapped_column(Boolean, default=False)
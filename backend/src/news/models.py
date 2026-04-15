import uuid

from datetime import datetime

from sqlalchemy import (String, Text, Float, TIMESTAMP, ARRAY,
                        ForeignKey, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.base_model import Base


class NewsArticle(Base):
    __tablename__ = "news_articles"

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    published_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    authors: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    url: Mapped[str] = mapped_column(String(1024), nullable=False, unique=True)
    source: Mapped[str | None] = mapped_column(String(256), nullable=True)
    source_domain: Mapped[str | None] = mapped_column(String(256), nullable=True)

    # Relationships
    tickers: Mapped[list["NewsArticleTicker"]] = relationship(
        back_populates="article", cascade="all, delete-orphan", lazy="selectin"
    )


class NewsArticleTicker(Base):
    __tablename__ = "news_article_tickers"
    __table_args__ = (
        UniqueConstraint("article_id", "ticker", name="uq_article_ticker"),
    )

    article_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("news_articles.id", ondelete="CASCADE"), nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    relevance_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationship
    article: Mapped["NewsArticle"] = relationship(back_populates="tickers")

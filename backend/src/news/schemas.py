from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

from src.news.constants import NewsCategory, SentimentLabel


class TickerResponse(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    relevance_score: float | None = Field(None, description="Relevance score of the ticker to the article")

    model_config = {"from_attributes": True}


class NewsArticleResponse(BaseModel):
    id: UUID
    title: str = Field(..., description="Article title")
    summary: str | None = Field(None, description="Article summary")
    published_at: datetime = Field(..., description="Publication timestamp")
    authors: list[str] | None = Field(None, description="List of authors")
    url: str = Field(..., description="Original article URL")
    source: str | None = Field(None, description="News source name")
    source_domain: str | None = Field(None, description="News source domain")
    category: NewsCategory | None = Field(None, description="Asset category this article belongs to")
    sentiment_label: SentimentLabel | None = Field(None, description="Sentiment signal: BULLISH / BEARISH / NEUTRAL")
    sentiment_score: float | None = Field(None, description="VADER compound score in [-1.0, 1.0]")
    tickers: list[TickerResponse] = Field(default_factory=list, description="Related tickers")
    created_at: datetime = Field(..., description="Record creation time")
    updated_at: datetime = Field(..., description="Record last update time")

    model_config = {"from_attributes": True}


class NewsArticleListResponse(BaseModel):
    items: list[NewsArticleResponse] = Field(..., description="List of news articles")
    total: int = Field(..., description="Total number of matching articles")
    skip: int = Field(..., description="Number of articles skipped")
    limit: int = Field(..., description="Maximum articles returned per page")


class NewsArticleCreate(BaseModel):
    title: str = Field(..., max_length=512, description="Article title")
    summary: str | None = Field(None, description="Article summary")
    published_at: datetime = Field(..., description="Publication timestamp")
    authors: list[str] | None = Field(None, description="List of authors")
    url: str = Field(..., max_length=1024, description="Original article URL")
    source: str | None = Field(None, description="News source name")
    source_domain: str | None = Field(None, description="News source domain")
    category: NewsCategory | None = Field(None, description="Asset category this article belongs to")
    tickers: list[str] = Field(default_factory=list, description="Ticker symbols to associate")


class NewsArticleUpdate(BaseModel):
    title: str | None = Field(None, max_length=512, description="Article title")
    summary: str | None = Field(None, description="Article summary")
    published_at: datetime | None = Field(None, description="Publication timestamp")
    authors: list[str] | None = Field(None, description="List of authors")
    source: str | None = Field(None, description="News source name")
    source_domain: str | None = Field(None, description="News source domain")
    category: NewsCategory | None = Field(None, description="Asset category this article belongs to")
    tickers: list[str] | None = Field(None, description="Ticker symbols — if provided, replaces all existing")

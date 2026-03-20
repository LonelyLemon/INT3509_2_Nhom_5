from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class TickerSentimentResponse(BaseModel):
    ticker: str = Field(..., description="Stock ticker symbol")
    relevance_score: float | None = Field(None, description="Relevance score of the ticker to the article")
    sentiment_score: float | None = Field(None, description="Sentiment score for this ticker")


class TopicResponse(BaseModel):
    topic: str = Field(..., description="Topic name")
    relevance_score: float | None = Field(None, description="Relevance score of the topic to the article")


class NewsArticleResponse(BaseModel):
    id: UUID
    title: str = Field(..., description="Article title")
    summary: str = Field(..., description="Article summary")
    published_at: datetime = Field(..., description="Publication timestamp")
    authors: list[str] | None = Field(None, description="List of authors")
    url: str = Field(..., description="Original article URL")
    source: str | None = Field(None, description="News source name")
    source_domain: str | None = Field(None, description="News source domain")
    primary_topic: str | None = Field(None, description="Topic with highest relevance score")
    primary_ticker: str | None = Field(None, description="Ticker with highest relevance score")
    overall_sentiment_score: float | None = Field(None, description="Overall sentiment score")
    overall_sentiment_label: str | None = Field(None, description="Overall sentiment label")
    tickers: list[TickerSentimentResponse] = Field(default_factory=list, description="Related ticker sentiments")
    topics: list[TopicResponse] = Field(default_factory=list, description="Related topics")
    created_at: datetime = Field(..., description="Record creation time")

    model_config = {"from_attributes": True}


class NewsArticleListResponse(BaseModel):
    items: list[NewsArticleResponse] = Field(..., description="List of news articles")
    total: int = Field(..., description="Total number of matching articles")

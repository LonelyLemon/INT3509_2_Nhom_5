"""add_sentiment_to_news_articles

Revision ID: d2e3f4a5b6c7
Revises: c1d2e3f4a5b6
Create Date: 2026-04-27 00:00:00.000000

Changes:
  1. Add nullable `sentiment_label` column (VARCHAR 10) to news_articles.
     Values: BULLISH | BEARISH | NEUTRAL — set at ingestion time via VADER + LM lexicon.
  2. Add nullable `sentiment_score` column (FLOAT) to news_articles.
     VADER compound score in [-1.0, 1.0].
  3. Add btree index on sentiment_label for efficient sentiment filtering.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d2e3f4a5b6c7"
down_revision: Union[str, Sequence[str], None] = "c1d2e3f4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add sentiment_label column
    op.add_column(
        "news_articles",
        sa.Column("sentiment_label", sa.String(10), nullable=True),
    )

    # 2. Add sentiment_score column
    op.add_column(
        "news_articles",
        sa.Column("sentiment_score", sa.Float(), nullable=True),
    )

    # 3. Index for filtering by sentiment_label
    op.create_index(
        "ix_news_articles_sentiment_label",
        "news_articles",
        ["sentiment_label"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("ix_news_articles_sentiment_label", table_name="news_articles")
    op.drop_column("news_articles", "sentiment_score")
    op.drop_column("news_articles", "sentiment_label")

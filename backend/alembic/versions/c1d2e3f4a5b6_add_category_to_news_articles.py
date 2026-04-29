"""add_category_to_news_articles

Revision ID: c1d2e3f4a5b6
Revises: b7c8d9e0f1a2
Create Date: 2026-04-27 00:00:00.000000

Changes:
  1. Add nullable `category` column (VARCHAR 20) to news_articles.
     Values are derived from the source asset's type at ingestion time:
     STOCK | CRYPTO | FOREX | ETF | INDEX | MACRO.
  2. Add btree index on category for efficient category filtering.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c1d2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add category column (nullable — existing rows get NULL)
    op.add_column(
        "news_articles",
        sa.Column("category", sa.String(20), nullable=True),
    )

    # 2. Index for filtering by category
    op.create_index(
        "ix_news_articles_category",
        "news_articles",
        ["category"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("ix_news_articles_category", table_name="news_articles")
    op.drop_column("news_articles", "category")

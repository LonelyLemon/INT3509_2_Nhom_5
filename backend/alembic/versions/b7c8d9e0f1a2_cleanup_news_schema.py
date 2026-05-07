"""cleanup_news_schema

Revision ID: b7c8d9e0f1a2
Revises: a1b2c3d4e5f6
Create Date: 2026-04-14 00:00:00.000000

Changes:
  1. Make news_articles.summary nullable (yfinance often returns no summary).
  2. Drop deprecated columns from news_articles that yfinance does not provide:
       primary_ticker, primary_topic, overall_sentiment_score, overall_sentiment_label
  3. Drop news_article_tickers.sentiment_score (yfinance provides no per-ticker sentiment).
  4. Drop news_article_topics table and its index (yfinance provides no topic data).
  5. Add btree index on news_articles.published_at for efficient time-range queries.
  6. Add btree index on news_articles.source_domain for source filtering.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b7c8d9e0f1a2"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Make summary nullable
    op.alter_column(
        "news_articles", "summary",
        existing_type=sa.Text(),
        nullable=True,
    )

    # 2. Drop deprecated columns from news_articles
    op.drop_column("news_articles", "primary_ticker")
    op.drop_column("news_articles", "primary_topic")
    op.drop_column("news_articles", "overall_sentiment_score")
    op.drop_column("news_articles", "overall_sentiment_label")

    # 3. Drop sentiment_score from news_article_tickers
    op.drop_column("news_article_tickers", "sentiment_score")

    # 4. Drop news_article_topics table (index first, then table)
    op.drop_index(op.f("news_article_topics_id_idx"), table_name="news_article_topics")
    op.drop_table("news_article_topics")

    # 5. Add index on published_at for time-range queries and default ordering
    op.create_index(
        "ix_news_articles_published_at",
        "news_articles",
        ["published_at"],
        postgresql_using="btree",
    )

    # 6. Add index on source_domain for source filtering
    op.create_index(
        "ix_news_articles_source_domain",
        "news_articles",
        ["source_domain"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    # 6 & 5: Drop the new indexes
    op.drop_index("ix_news_articles_source_domain", table_name="news_articles")
    op.drop_index("ix_news_articles_published_at", table_name="news_articles")

    # 4: Recreate news_article_topics table
    op.create_table(
        "news_article_topics",
        sa.Column("article_id", sa.Uuid(), nullable=False),
        sa.Column("topic", sa.String(length=128), nullable=False),
        sa.Column("relevance_score", sa.Float(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["article_id"], ["news_articles.id"],
            name=op.f("news_article_topics_article_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("news_article_topics_pkey")),
        sa.UniqueConstraint("article_id", "topic", name="uq_article_topic"),
    )
    op.create_index(
        op.f("news_article_topics_id_idx"),
        "news_article_topics",
        ["id"],
        unique=False,
    )

    # 3: Restore sentiment_score to news_article_tickers
    op.add_column(
        "news_article_tickers",
        sa.Column("sentiment_score", sa.Float(), nullable=True),
    )

    # 2: Restore deprecated columns to news_articles
    op.add_column("news_articles", sa.Column("overall_sentiment_label", sa.String(length=50), nullable=True))
    op.add_column("news_articles", sa.Column("overall_sentiment_score", sa.Float(), nullable=True))
    op.add_column("news_articles", sa.Column("primary_ticker", sa.String(length=20), nullable=True))
    op.add_column("news_articles", sa.Column("primary_topic", sa.String(length=128), nullable=True))

    # 1: Restore summary to NOT NULL
    # Use a temporary server_default to handle any NULL rows introduced after upgrade
    op.alter_column(
        "news_articles", "summary",
        existing_type=sa.Text(),
        nullable=False,
        server_default="",
    )
    op.alter_column(
        "news_articles", "summary",
        existing_type=sa.Text(),
        server_default=None,
    )

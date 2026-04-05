"""optimize_timescaledb_chunk_interval_and_news_ticker_index

Revision ID: a1b2c3d4e5f6
Revises: 9fab416bdb1b
Create Date: 2026-04-05 00:00:00.000000

Changes:
  1. Set price_data hypertable chunk_time_interval to 1 day.
     The default (7 days) is too coarse for 1-minute candle data — smaller
     chunks mean faster time-range scans and more efficient compression.

  2. Add btree index on news_article_tickers.ticker so that
     GET /news?ticker=X can filter efficiently without a full table scan.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "9fab416bdb1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Tighten TimescaleDB chunk interval for 1-minute price data.
    #    Requires TimescaleDB extension (already enabled by previous migration).
    op.execute(
        "SELECT set_chunk_time_interval('price_data', INTERVAL '1 day');"
    )

    # 2. Index for news filtering by ticker symbol.
    op.create_index(
        "ix_news_article_tickers_ticker",
        "news_article_tickers",
        ["ticker"],
        postgresql_using="btree",
    )


def downgrade() -> None:
    op.drop_index("ix_news_article_tickers_ticker", table_name="news_article_tickers")

    # Revert to TimescaleDB default (7 days).
    op.execute(
        "SELECT set_chunk_time_interval('price_data', INTERVAL '7 days');"
    )

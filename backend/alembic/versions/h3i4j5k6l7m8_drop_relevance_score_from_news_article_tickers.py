"""drop_relevance_score_from_news_article_tickers

Revision ID: h3i4j5k6l7m8
Revises: g2b3c4d5e6f7
Create Date: 2026-05-06 00:00:00.000000

Column was always NULL — never populated by the ingestion pipeline.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "h3i4j5k6l7m8"
down_revision: Union[str, Sequence[str], None] = "g2b3c4d5e6f7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("news_article_tickers", "relevance_score")


def downgrade() -> None:
    op.add_column(
        "news_article_tickers",
        sa.Column("relevance_score", sa.Float(), nullable=True),
    )

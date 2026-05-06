"""merge_heads

Revision ID: g2b3c4d5e6f7
Revises: d2e3f4a5b6c7, f1a2b3c4d5e6
Create Date: 2026-04-30 00:00:00.000000

Merges two diverged heads:
  - d2e3f4a5b6c7 (add_sentiment_to_news_articles)
  - f1a2b3c4d5e6 (add_conversations_messages)
"""

from typing import Sequence, Union

from alembic import op


revision: str = "g2b3c4d5e6f7"
down_revision: Union[str, Sequence[str], None] = ("d2e3f4a5b6c7", "f1a2b3c4d5e6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass

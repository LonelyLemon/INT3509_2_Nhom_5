"""merge posts/comments branch into main

Revision ID: i4j5k6l7m8n9
Revises: a8f9fb304910, h3i4j5k6l7m8
Create Date: 2026-05-07 16:11:00.000000

This merge revision joins:
  - a8f9fb304910 (create_posts_and_comments_tables)   ← feature branch
  - h3i4j5k6l7m8 (drop_relevance_score_from_news_...)  ← main chain
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'i4j5k6l7m8n9'
down_revision: Union[str, Sequence[str], None] = ('a8f9fb304910', 'h3i4j5k6l7m8')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Merge: no schema changes needed."""
    pass


def downgrade() -> None:
    """Merge: no schema changes to revert."""
    pass

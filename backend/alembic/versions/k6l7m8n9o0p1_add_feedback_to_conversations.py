"""add feedback to conversations

Revision ID: k6l7m8n9o0p1
Revises: j5k6l7m8n9o0
Create Date: 2026-05-12 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "k6l7m8n9o0p1"
down_revision = "j5k6l7m8n9o0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("conversations", sa.Column("rating", sa.String(8), nullable=True))
    op.add_column("conversations", sa.Column("feedback_text", sa.Text(), nullable=True))
    op.add_column(
        "conversations",
        sa.Column("rated_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("conversations", "rated_at")
    op.drop_column("conversations", "feedback_text")
    op.drop_column("conversations", "rating")

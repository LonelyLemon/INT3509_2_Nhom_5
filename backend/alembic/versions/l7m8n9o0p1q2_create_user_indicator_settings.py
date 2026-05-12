"""create user_indicator_settings table

Revision ID: l7m8n9o0p1q2
Revises: k6l7m8n9o0p1
Create Date: 2026-05-12 00:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
import uuid

revision = "l7m8n9o0p1q2"
down_revision = "k6l7m8n9o0p1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_indicator_settings",
        sa.Column("id", sa.UUID(), nullable=False, default=uuid.uuid4),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("settings", JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_indicator_settings_user_id"),
    )
    op.create_index(
        "ix_user_indicator_settings_user_id",
        "user_indicator_settings",
        ["user_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_user_indicator_settings_user_id", table_name="user_indicator_settings")
    op.drop_table("user_indicator_settings")

"""drop avg_buy_price from holdings

Revision ID: j5k6l7m8n9o0
Revises: i4j5k6l7m8n9
Create Date: 2026-05-09 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = "j5k6l7m8n9o0"
down_revision = "i4j5k6l7m8n9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("holdings", "avg_buy_price")


def downgrade() -> None:
    op.add_column(
        "holdings",
        sa.Column("avg_buy_price", sa.Float(), nullable=False, server_default="0"),
    )
    op.alter_column("holdings", "avg_buy_price", server_default=None)

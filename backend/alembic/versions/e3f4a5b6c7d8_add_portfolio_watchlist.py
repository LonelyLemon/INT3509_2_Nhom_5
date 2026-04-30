"""add_portfolio_watchlist

Revision ID: e3f4a5b6c7d8
Revises: b7c8d9e0f1a2
Create Date: 2026-04-29 00:00:00.000000

Changes:
  1. Create portfolios table (id, user_id FK→users, name, description, is_default, timestamps)
  2. Create holdings table (id, portfolio_id FK→portfolios, asset_id FK→assets,
     quantity, avg_buy_price, notes, timestamps) with unique(portfolio_id, asset_id)
  3. Create watchlist_items table (id, user_id FK→users, asset_id FK→assets,
     position, timestamps) with unique(user_id, asset_id)
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "portfolios",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_portfolios_id", "portfolios", ["id"])
    op.create_index("ix_portfolios_user_id", "portfolios", ["user_id"])

    op.create_table(
        "holdings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("portfolio_id", sa.UUID(), nullable=False),
        sa.Column("asset_id", sa.UUID(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("avg_buy_price", sa.Float(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["portfolio_id"], ["portfolios.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("portfolio_id", "asset_id", name="uq_holding_portfolio_asset"),
    )
    op.create_index("ix_holdings_id", "holdings", ["id"])
    op.create_index("ix_holdings_portfolio_id", "holdings", ["portfolio_id"])

    op.create_table(
        "watchlist_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("asset_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "asset_id", name="uq_watchlist_user_asset"),
    )
    op.create_index("ix_watchlist_items_id", "watchlist_items", ["id"])
    op.create_index("ix_watchlist_items_user_id", "watchlist_items", ["user_id"])


def downgrade() -> None:
    op.drop_table("watchlist_items")
    op.drop_table("holdings")
    op.drop_table("portfolios")

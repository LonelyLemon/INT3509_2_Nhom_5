"""make_price_data_hypertable

Revision ID: 9fab416bdb1b
Revises: f3736648e594
Create Date: 2026-03-27 10:06:43.247116

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9fab416bdb1b'
down_revision: Union[str, Sequence[str], None] = 'f3736648e594'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE EXTENSION IF NOT EXISTS timescaledb;")
    op.execute("SELECT create_hypertable('price_data', 'timestamp', migrate_data => true);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP EXTENSION IF EXISTS timescaledb;")

"""add start date to fee

Revision ID: 20241202001
Revises: 20241201001
Create Date: 2024-12-02 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20241202001"
down_revision: str | None = "20241201001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("thuphi", sa.Column("start_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("thuphi", "start_date")


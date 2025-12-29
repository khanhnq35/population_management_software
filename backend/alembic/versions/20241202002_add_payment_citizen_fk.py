"""add citizen reference to payments

Revision ID: 20241202002
Revises: 20241202001
Create Date: 2024-12-02 00:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20241202002"
down_revision: str | None = "20241202001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("payments", sa.Column("citizen_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "payments_citizen_id_fkey",
        "payments",
        "nhankhau",
        ["citizen_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("payments_citizen_id_fkey", "payments", type_="foreignkey")
    op.drop_column("payments", "citizen_id")


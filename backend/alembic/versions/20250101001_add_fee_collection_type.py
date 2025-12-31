"""add collection type for fees

Revision ID: 20250101001_add_fee_collection_type
Revises: 20251231001_make_national_id_required
Create Date: 2025-12-31 20:05:00
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20250101001_add_fee_collection_type"
down_revision = "20251231001_make_national_id_required"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "thuphi",
        sa.Column("collection_type", sa.String(length=50), nullable=False, server_default="none"),
    )
    op.add_column("thuphi", sa.Column("target_codes", sa.JSON(), nullable=True))
    op.alter_column("thuphi", "amount", existing_type=sa.Float(), nullable=True)
    # ensure existing rows have explicit value
    op.execute("UPDATE thuphi SET collection_type = 'none' WHERE collection_type IS NULL")
    op.alter_column("thuphi", "collection_type", server_default=None)


def downgrade() -> None:
    op.execute("UPDATE thuphi SET amount = 0 WHERE amount IS NULL")
    op.alter_column("thuphi", "amount", existing_type=sa.Float(), nullable=False)
    op.drop_column("thuphi", "target_codes")
    op.drop_column("thuphi", "collection_type")

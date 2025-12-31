"""make national_id required

Revision ID: 20251231001
Revises: 20241202002
Create Date: 2025-12-31

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251231001'
down_revision: Union[str, None] = '20241202002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # First, update any NULL values to empty string or a default value
    op.execute("UPDATE nhankhau SET national_id = '' WHERE national_id IS NULL")
    
    # Then alter the column to be NOT NULL
    op.alter_column('nhankhau', 'national_id',
               existing_type=sa.VARCHAR(length=20),
               nullable=False)


def downgrade() -> None:
    # Revert the column to allow NULL
    op.alter_column('nhankhau', 'national_id',
               existing_type=sa.VARCHAR(length=20),
               nullable=True)

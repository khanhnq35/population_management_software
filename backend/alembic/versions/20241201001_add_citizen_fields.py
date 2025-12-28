"""add citizen fields and required household

Revision ID: 20241201001
Revises: 20240512001
Create Date: 2024-12-01 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20241201001"
down_revision: str | None = "20240512001"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    # Create relationship_enum
    relationship_enum = sa.Enum("chu_ho", "bo", "me", "ong", "ba", "anh", "chi", "em", "chong", "vo", "con", "chau", name="relationship_enum")
    relationship_enum.create(op.get_bind(), checkfirst=True)
    
    # First, handle existing NULL household_id records
    # Delete citizens with NULL household_id as they can't exist without a household
    op.execute(sa.text("DELETE FROM nhankhau WHERE household_id IS NULL"))
    
    # Add new columns (all nullable first)
    op.add_column("nhankhau", sa.Column("citizen_code", sa.String(length=50), nullable=True))
    op.add_column("nhankhau", sa.Column("household_code", sa.String(length=50), nullable=True))
    op.add_column("nhankhau", sa.Column("relationship_to_head", relationship_enum, nullable=True))
    op.add_column("nhankhau", sa.Column("birthplace", sa.String(length=255), nullable=True))
    op.add_column("nhankhau", sa.Column("nationality", sa.String(length=100), nullable=True))
    op.add_column("nhankhau", sa.Column("ethnicity", sa.String(length=100), nullable=True))
    
    # Populate citizen_code with temporary values for existing records
    op.execute(sa.text("UPDATE nhankhau SET citizen_code = 'CITIZEN_' || CAST(id AS VARCHAR) WHERE citizen_code IS NULL"))
    
    # Populate household_code from hogiadinh for existing records
    op.execute(sa.text("""
        UPDATE nhankhau 
        SET household_code = (SELECT household_code FROM hogiadinh WHERE hogiadinh.id = nhankhau.household_id)
        WHERE household_code IS NULL
    """))
    
    # Populate relationship_to_head with default
    op.execute(sa.text("UPDATE nhankhau SET relationship_to_head = 'chu_ho' WHERE relationship_to_head IS NULL"))
    
    # Populate nationality with default
    op.execute(sa.text("UPDATE nhankhau SET nationality = 'Việt Nam' WHERE nationality IS NULL"))
    
    # Make citizen_code NOT NULL and create unique index
    op.alter_column("nhankhau", "citizen_code", nullable=False)
    op.create_index(op.f("ix_nhankhau_citizen_code"), "nhankhau", ["citizen_code"], unique=True)
    
    # Make relationship_to_head NOT NULL
    op.alter_column("nhankhau", "relationship_to_head", nullable=False, server_default="chu_ho")
    
    # Change household_id from nullable to NOT NULL and update foreign key
    op.drop_constraint("nhankhau_household_id_fkey", "nhankhau", type_="foreignkey")
    op.alter_column("nhankhau", "household_id", nullable=False)
    op.create_foreign_key("nhankhau_household_id_fkey", "nhankhau", "hogiadinh", ["household_id"], ["id"], ondelete="CASCADE")
    op.create_index(op.f("ix_nhankhau_household_id"), "nhankhau", ["household_id"], unique=False)


def downgrade() -> None:
    # Remove index
    op.drop_index(op.f("ix_nhankhau_household_id"), table_name="nhankhau")
    op.drop_index(op.f("ix_nhankhau_citizen_code"), table_name="nhankhau")
    
    # Change household_id back to nullable
    op.drop_constraint("nhankhau_household_id_fkey", "nhankhau", type_="foreignkey")
    op.alter_column("nhankhau", "household_id", nullable=True)
    op.create_foreign_key("nhankhau_household_id_fkey", "nhankhau", "hogiadinh", ["household_id"], ["id"], ondelete="SET NULL")
    
    # Remove new columns
    op.drop_column("nhankhau", "ethnicity")
    op.drop_column("nhankhau", "nationality")
    op.drop_column("nhankhau", "birthplace")
    op.drop_column("nhankhau", "relationship_to_head")
    op.drop_column("nhankhau", "household_code")
    op.drop_column("nhankhau", "citizen_code")
    
    # Drop enum
    relationship_enum = sa.Enum(name="relationship_enum")
    relationship_enum.drop(op.get_bind(), checkfirst=True)


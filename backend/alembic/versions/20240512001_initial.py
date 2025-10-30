"""initial schema

Revision ID: 20240512001
Revises:
Create Date: 2024-05-12 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20240512001"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    role_enum = sa.Enum("admin", "to_truong", "ke_toan", name="role_enum")
    status_enum = sa.Enum("thuong_tru", "tam_tru", "tam_vang", name="status_enum")

    role_enum.create(op.get_bind(), checkfirst=True)
    status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("full_name", sa.String(length=128), nullable=False),
        sa.Column("role", role_enum, nullable=False, server_default=sa.text("'to_truong'")),
        sa.Column("hashed_password", sa.String(length=256), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "hogiadinh",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("household_code", sa.String(length=50), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("head_of_household", sa.String(length=128), nullable=False),
        sa.Column("established_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hogiadinh_household_code"), "hogiadinh", ["household_code"], unique=True)
    op.create_index(op.f("ix_hogiadinh_id"), "hogiadinh", ["id"], unique=False)

    op.create_table(
        "thuphi",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_thuphi_id"), "thuphi", ["id"], unique=False)

    op.create_table(
        "nhankhau",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(length=128), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("gender", sa.String(length=16), nullable=False),
        sa.Column("national_id", sa.String(length=20), nullable=True),
        sa.Column("household_id", sa.Integer(), nullable=True),
        sa.Column("status", status_enum, nullable=False, server_default=sa.text("'thuong_tru'")),
        sa.Column("occupation", sa.String(length=128), nullable=True),
        sa.Column("temporary_address", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.ForeignKeyConstraint(["household_id"], ["hogiadinh.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_nhankhau_full_name"), "nhankhau", ["full_name"], unique=False)
    op.create_index(op.f("ix_nhankhau_id"), "nhankhau", ["id"], unique=False)
    op.create_index(op.f("ix_nhankhau_national_id"), "nhankhau", ["national_id"], unique=True)

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("citizen_name", sa.String(length=128), nullable=False),
        sa.Column("household_code", sa.String(length=50), nullable=True),
        sa.Column("amount_paid", sa.Float(), nullable=False),
        sa.Column("payment_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("fee_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["fee_id"], ["thuphi.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_payments_id"), "payments", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_payments_id"), table_name="payments")
    op.drop_table("payments")
    op.drop_index(op.f("ix_nhankhau_national_id"), table_name="nhankhau")
    op.drop_index(op.f("ix_nhankhau_id"), table_name="nhankhau")
    op.drop_index(op.f("ix_nhankhau_full_name"), table_name="nhankhau")
    op.drop_table("nhankhau")
    op.drop_index(op.f("ix_thuphi_id"), table_name="thuphi")
    op.drop_table("thuphi")
    op.drop_index(op.f("ix_hogiadinh_id"), table_name="hogiadinh")
    op.drop_index(op.f("ix_hogiadinh_household_code"), table_name="hogiadinh")
    op.drop_table("hogiadinh")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_table("users")
    sa.Enum(name="status_enum").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="role_enum").drop(op.get_bind(), checkfirst=True)

"""super admin, approver tracking, dynamic pricing, min-stay rules, receipts

Revision ID: f7a1c2d3e4b5
Revises: e24bb53f7fdb
Create Date: 2026-07-10

Adds:
  * users.created_by_admin_id, users.admin_notes
  * bookings.approved_by / approved_at
  * event_registrations.approved_by / approved_at
  * room_pricing_rules   (date-range custom pricing)
  * room_booking_rules   (minimum-stay windows)
  * receipts             (booking + event receipts)

The ``super_admin`` value is added to the user_role enum for Postgres; on
SQLite the role column is a plain VARCHAR with no CHECK constraint, so no
change is needed there.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f7a1c2d3e4b5"
down_revision: Union[str, Sequence[str], None] = "e24bb53f7fdb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table, column) -> bool:
    insp = sa.inspect(bind)
    return column in [c["name"] for c in insp.get_columns(table)]


def upgrade() -> None:
    bind = op.get_bind()

    # Postgres: extend the enum type. SQLite: nothing to do (plain VARCHAR).
    if bind.dialect.name == "postgresql":
        op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin'")

    # --- users ---
    if not _has_column(bind, "users", "created_by_admin_id"):
        op.add_column("users", sa.Column("created_by_admin_id", sa.Uuid(), nullable=True))
    if not _has_column(bind, "users", "admin_notes"):
        op.add_column("users", sa.Column("admin_notes", sa.String(length=1000), nullable=True))

    # --- bookings ---
    if not _has_column(bind, "bookings", "approved_by"):
        op.add_column("bookings", sa.Column("approved_by", sa.Uuid(), nullable=True))
    if not _has_column(bind, "bookings", "approved_at"):
        op.add_column("bookings", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))

    # --- event_registrations ---
    if not _has_column(bind, "event_registrations", "approved_by"):
        op.add_column("event_registrations", sa.Column("approved_by", sa.Uuid(), nullable=True))
    if not _has_column(bind, "event_registrations", "approved_at"):
        op.add_column("event_registrations", sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True))

    insp = sa.inspect(bind)
    existing_tables = insp.get_table_names()

    # --- room_pricing_rules ---
    if "room_pricing_rules" not in existing_tables:
        op.create_table(
            "room_pricing_rules",
            sa.Column("rule_id", sa.Uuid(), nullable=False),
            sa.Column("room_id", sa.Uuid(), nullable=False),
            sa.Column("label", sa.String(length=200), nullable=True),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("price_per_day", sa.Numeric(10, 2), nullable=False),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["room_id"], ["rooms.room_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("rule_id"),
        )

    # --- room_booking_rules ---
    if "room_booking_rules" not in existing_tables:
        op.create_table(
            "room_booking_rules",
            sa.Column("rule_id", sa.Uuid(), nullable=False),
            sa.Column("room_id", sa.Uuid(), nullable=True),
            sa.Column("label", sa.String(length=200), nullable=True),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("min_days", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["room_id"], ["rooms.room_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("rule_id"),
        )

    # --- receipts ---
    if "receipts" not in existing_tables:
        op.create_table(
            "receipts",
            sa.Column("receipt_id", sa.Uuid(), nullable=False),
            sa.Column("receipt_number", sa.String(length=50), nullable=False),
            sa.Column("receipt_type", sa.Enum("BOOKING", "EVENT", name="receipt_type"), nullable=False),
            sa.Column("booking_id", sa.Uuid(), nullable=True),
            sa.Column("registration_id", sa.Uuid(), nullable=True),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("payer_name", sa.String(length=300), nullable=False),
            sa.Column("description", sa.String(length=500), nullable=True),
            sa.Column("amount", sa.Numeric(10, 2), nullable=False),
            sa.Column("payment_mode", sa.String(length=50), nullable=True),
            sa.Column("is_offline", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("issued_by", sa.Uuid(), nullable=True),
            sa.Column("issued_by_name", sa.String(length=300), nullable=True),
            sa.Column("pdf_url", sa.String(length=500), nullable=True),
            sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["booking_id"], ["bookings.booking_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["registration_id"], ["event_registrations.registration_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["issued_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("receipt_id"),
        )
        op.create_index("ix_receipts_receipt_number", "receipts", ["receipt_number"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_receipts_receipt_number", table_name="receipts")
    op.drop_table("receipts")
    op.drop_table("room_booking_rules")
    op.drop_table("room_pricing_rules")
    op.drop_column("event_registrations", "approved_at")
    op.drop_column("event_registrations", "approved_by")
    op.drop_column("bookings", "approved_at")
    op.drop_column("bookings", "approved_by")
    op.drop_column("users", "admin_notes")
    op.drop_column("users", "created_by_admin_id")
    # receipt_type enum + user_role value left in place (harmless on Postgres)

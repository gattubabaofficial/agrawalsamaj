"""add bhavan booking enquiry system

Revision ID: b1c2d3e4f5a6
Revises: d4e6f8a0b2c3, g1a2b3c4d5e6
Create Date: 2026-08-12

NOTE ON down_revision: this repo's migration history already has two
disconnected heads (see `python -m alembic heads`):
  - d4e6f8a0b2c3  add special event pricing & booking restrictions
  - g1a2b3c4d5e6  add guest author fields to blogs (down_revision hardcoded
    to None instead of e24bb53f7fdb, despite its own docstring saying
    "Revises: e24bb53f7fdb" — looks like an authoring mistake made before
    this task, not something introduced here)
This revision is written as a merge of both heads so it captures the full
prior history without guessing which head is "correct" or discarding either
branch. It does not otherwise alter the pre-existing g1a2b3c4d5e6 file.

Adds all fourteen ``bhavan_*`` tables plus ``phone_otp_requests.purpose``,
mirroring ``app/models/bhavan.py`` and the ``purpose`` column added to
``PhoneOTPRequest`` in ``app/models/user.py``.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, Sequence[str], None] = ("d4e6f8a0b2c3", "g1a2b3c4d5e6")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = insp.get_table_names()

    if "bhavan_accommodation_types" not in existing_tables:
        op.create_table(
            "bhavan_accommodation_types",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column(
                "kind",
                sa.Enum("ROOM", "DORMITORY", name="bhavan_accommodation_kind"),
                nullable=False,
            ),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("capacity_per_unit", sa.Integer(), nullable=False),
            sa.Column("base_price_per_night", sa.Numeric(10, 2), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_accommodation_images" not in existing_tables:
        op.create_table(
            "bhavan_accommodation_images",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("accommodation_type_id", sa.Uuid(), nullable=False),
            sa.Column("path", sa.String(length=500), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(
                ["accommodation_type_id"], ["bhavan_accommodation_types.id"], ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_units" not in existing_tables:
        op.create_table(
            "bhavan_units",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("accommodation_type_id", sa.Uuid(), nullable=False),
            sa.Column("label", sa.String(length=50), nullable=False),
            sa.Column("capacity", sa.Integer(), nullable=True),
            sa.Column(
                "status",
                sa.Enum("AVAILABLE", "MAINTENANCE", "INACTIVE", name="bhavan_unit_status"),
                nullable=False,
            ),
            sa.Column("notes", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(
                ["accommodation_type_id"], ["bhavan_accommodation_types.id"], ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("accommodation_type_id", "label", name="uq_bhavan_unit_label"),
        )

    if "bhavan_amenities" not in existing_tables:
        op.create_table(
            "bhavan_amenities",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("image_path", sa.String(length=500), nullable=True),
            sa.Column("price", sa.Numeric(10, 2), nullable=False),
            sa.Column(
                "pricing_type",
                sa.Enum(
                    "PER_UNIT", "PER_DAY", "PER_NIGHT", "PER_BOOKING", "ONE_TIME",
                    name="bhavan_amenity_pricing_type",
                ),
                nullable=False,
            ),
            sa.Column("available_quantity", sa.Integer(), nullable=True),
            sa.Column("allow_over_request", sa.Boolean(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_purposes" not in existing_tables:
        op.create_table(
            "bhavan_purposes",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_settings" not in existing_tables:
        op.create_table(
            "bhavan_settings",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("default_min_nights", sa.Integer(), nullable=False),
            sa.Column("default_max_nights", sa.Integer(), nullable=True),
            sa.Column("advance_booking_days", sa.Integer(), nullable=False),
            sa.Column("otp_ttl_seconds", sa.Integer(), nullable=False),
            sa.Column("otp_resend_cooldown_seconds", sa.Integer(), nullable=False),
            sa.Column("otp_max_attempts", sa.Integer(), nullable=False),
            sa.Column("required_fields", sa.JSON(), nullable=False),
            sa.Column("contact_phone", sa.String(length=20), nullable=True),
            sa.Column("intro_text", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_rule_profiles" not in existing_tables:
        op.create_table(
            "bhavan_rule_profiles",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column(
                "category",
                sa.Enum(
                    "EVENT", "PRICING", "DISCOUNT", "CLOSURE", "CUSTOM",
                    name="bhavan_rule_category",
                ),
                nullable=False,
            ),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("config", sa.JSON(), nullable=False),
            sa.Column(
                "status",
                sa.Enum("ACTIVE", "INACTIVE", "ARCHIVED", name="bhavan_rule_status"),
                nullable=False,
            ),
            sa.Column("is_template", sa.Boolean(), nullable=False),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("updated_by", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["updated_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_rule_assignments" not in existing_tables:
        op.create_table(
            "bhavan_rule_assignments",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("profile_id", sa.Uuid(), nullable=False),
            sa.Column("label", sa.String(length=200), nullable=False),
            sa.Column("config_snapshot", sa.JSON(), nullable=False),
            sa.Column("applied_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("applied_by", sa.Uuid(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("revoked_by", sa.Uuid(), nullable=True),
            sa.Column("note", sa.String(length=500), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["profile_id"], ["bhavan_rule_profiles.id"], ondelete="RESTRICT"),
            sa.ForeignKeyConstraint(["applied_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["revoked_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_rule_assignment_dates" not in existing_tables:
        op.create_table(
            "bhavan_rule_assignment_dates",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("assignment_id", sa.Uuid(), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.ForeignKeyConstraint(["assignment_id"], ["bhavan_rule_assignments.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("assignment_id", "date", name="uq_bhavan_assignment_date"),
        )
        op.create_index(
            "ix_bhavan_rule_assignment_dates_date",
            "bhavan_rule_assignment_dates",
            ["date"],
        )
        op.create_index(
            "ix_bhavan_assignment_dates_date_assignment",
            "bhavan_rule_assignment_dates",
            ["date", "assignment_id"],
        )

    if "bhavan_terms_versions" not in existing_tables:
        op.create_table(
            "bhavan_terms_versions",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("version_label", sa.String(length=30), nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("is_published", sa.Boolean(), nullable=False),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("published_by", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["published_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_enquiries" not in existing_tables:
        op.create_table(
            "bhavan_enquiries",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("reference", sa.String(length=20), nullable=False),
            sa.Column("check_in", sa.Date(), nullable=False),
            sa.Column("check_out", sa.Date(), nullable=False),
            sa.Column("nights", sa.Integer(), nullable=False),
            sa.Column("purpose_id", sa.Uuid(), nullable=True),
            sa.Column("purpose_name", sa.String(length=200), nullable=True),
            sa.Column("full_name", sa.String(length=200), nullable=False),
            sa.Column("mobile", sa.String(length=20), nullable=False),
            sa.Column("whatsapp_number", sa.String(length=20), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("address", sa.Text(), nullable=True),
            sa.Column("city", sa.String(length=120), nullable=True),
            sa.Column("state", sa.String(length=120), nullable=True),
            sa.Column("guests_total", sa.Integer(), nullable=False),
            sa.Column("adults", sa.Integer(), nullable=False),
            sa.Column("children", sa.Integer(), nullable=False),
            sa.Column("special_requirements", sa.Text(), nullable=True),
            sa.Column("message", sa.Text(), nullable=True),
            sa.Column(
                "status",
                sa.Enum(
                    "PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "CANCELLED",
                    "COMPLETED", "EXPIRED", name="bhavan_enquiry_status",
                ),
                nullable=False,
            ),
            sa.Column(
                "source",
                sa.Enum("ONLINE", "PHONE", "WALK_IN", "ADMIN", name="bhavan_enquiry_source"),
                nullable=False,
            ),
            sa.Column("mobile_verified", sa.Boolean(), nullable=False),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("terms_version_id", sa.Uuid(), nullable=True),
            sa.Column("terms_accepted", sa.Boolean(), nullable=False),
            sa.Column("terms_accepted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("quote_snapshot", sa.JSON(), nullable=False),
            sa.Column("rules_snapshot", sa.JSON(), nullable=False),
            sa.Column("estimated_total", sa.Numeric(10, 2), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=True),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("reviewed_by", sa.Uuid(), nullable=True),
            sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("decision_reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["purpose_id"], ["bhavan_purposes.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["terms_version_id"], ["bhavan_terms_versions.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["user_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["reviewed_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("reference"),
            sa.CheckConstraint("check_out > check_in", name="ck_bhavan_enquiry_dates"),
        )
        op.create_index("ix_bhavan_enquiries_check_in", "bhavan_enquiries", ["check_in"])
        op.create_index("ix_bhavan_enquiries_check_out", "bhavan_enquiries", ["check_out"])
        op.create_index("ix_bhavan_enquiries_mobile", "bhavan_enquiries", ["mobile"])
        op.create_index("ix_bhavan_enquiries_status", "bhavan_enquiries", ["status"])
        op.create_index("ix_bhavan_enquiries_reference", "bhavan_enquiries", ["reference"])

    if "bhavan_enquiry_accommodations" not in existing_tables:
        op.create_table(
            "bhavan_enquiry_accommodations",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("enquiry_id", sa.Uuid(), nullable=False),
            sa.Column("accommodation_type_id", sa.Uuid(), nullable=True),
            sa.Column("type_name_snapshot", sa.String(length=200), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("nights", sa.Integer(), nullable=False),
            sa.Column("unit_price_snapshot", sa.Numeric(10, 2), nullable=False),
            sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
            sa.ForeignKeyConstraint(["enquiry_id"], ["bhavan_enquiries.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["accommodation_type_id"], ["bhavan_accommodation_types.id"], ondelete="SET NULL",
            ),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_enquiry_amenities" not in existing_tables:
        op.create_table(
            "bhavan_enquiry_amenities",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("enquiry_id", sa.Uuid(), nullable=False),
            sa.Column("amenity_id", sa.Uuid(), nullable=True),
            sa.Column("name_snapshot", sa.String(length=200), nullable=False),
            sa.Column("pricing_type_snapshot", sa.String(length=30), nullable=False),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("unit_price_snapshot", sa.Numeric(10, 2), nullable=False),
            sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
            sa.ForeignKeyConstraint(["enquiry_id"], ["bhavan_enquiries.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["amenity_id"], ["bhavan_amenities.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    if "bhavan_enquiry_notes" not in existing_tables:
        op.create_table(
            "bhavan_enquiry_notes",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("enquiry_id", sa.Uuid(), nullable=False),
            sa.Column("admin_id", sa.Uuid(), nullable=True),
            sa.Column("note", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["enquiry_id"], ["bhavan_enquiries.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["admin_id"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )

    columns = [c["name"] for c in insp.get_columns("phone_otp_requests")] if "phone_otp_requests" in existing_tables else []
    if "purpose" not in columns:
        op.add_column(
            "phone_otp_requests",
            sa.Column("purpose", sa.String(length=40), server_default="generic", nullable=False),
        )


def downgrade() -> None:
    op.drop_column("phone_otp_requests", "purpose")

    op.drop_table("bhavan_enquiry_notes")
    op.drop_table("bhavan_enquiry_amenities")
    op.drop_table("bhavan_enquiry_accommodations")

    op.drop_index("ix_bhavan_enquiries_reference", table_name="bhavan_enquiries")
    op.drop_index("ix_bhavan_enquiries_status", table_name="bhavan_enquiries")
    op.drop_index("ix_bhavan_enquiries_mobile", table_name="bhavan_enquiries")
    op.drop_index("ix_bhavan_enquiries_check_out", table_name="bhavan_enquiries")
    op.drop_index("ix_bhavan_enquiries_check_in", table_name="bhavan_enquiries")
    op.drop_table("bhavan_enquiries")

    op.drop_table("bhavan_terms_versions")

    op.drop_index(
        "ix_bhavan_assignment_dates_date_assignment", table_name="bhavan_rule_assignment_dates",
    )
    op.drop_index(
        "ix_bhavan_rule_assignment_dates_date", table_name="bhavan_rule_assignment_dates",
    )
    op.drop_table("bhavan_rule_assignment_dates")
    op.drop_table("bhavan_rule_assignments")
    op.drop_table("bhavan_rule_profiles")

    op.drop_table("bhavan_settings")
    op.drop_table("bhavan_purposes")
    op.drop_table("bhavan_amenities")
    op.drop_table("bhavan_units")
    op.drop_table("bhavan_accommodation_images")
    op.drop_table("bhavan_accommodation_types")

    # op.drop_table() only emits DROP TABLE. On Postgres, sa.Enum(...) columns
    # create real native ENUM types, and Alembic has no column type
    # information left at this point to drop them itself -- leaving all seven
    # orphaned would make a later upgrade fail with "type already exists".
    # checkfirst=True keeps this safe on a partially-migrated database.
    bind = op.get_bind()
    for enum_name in (
        "bhavan_accommodation_kind",
        "bhavan_unit_status",
        "bhavan_amenity_pricing_type",
        "bhavan_rule_category",
        "bhavan_rule_status",
        "bhavan_enquiry_status",
        "bhavan_enquiry_source",
    ):
        postgresql.ENUM(name=enum_name).drop(bind, checkfirst=True)

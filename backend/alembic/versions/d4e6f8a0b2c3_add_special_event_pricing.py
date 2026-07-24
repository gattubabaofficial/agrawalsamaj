"""add special event pricing & booking restrictions

Revision ID: d4e6f8a0b2c3
Revises: 6e60c5c1c599
Create Date: 2026-07-24

Adds:
  * special_events              (named event: name, description, active, priority, block_unlisted_rooms)
  * special_event_date_ranges   (one or more date ranges per event)
  * special_event_room_configs  (per-room special price / availability / min-max stay for an event)
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d4e6f8a0b2c3"
down_revision: Union[str, Sequence[str], None] = "6e60c5c1c599"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    existing_tables = insp.get_table_names()

    if "special_events" not in existing_tables:
        op.create_table(
            "special_events",
            sa.Column("event_id", sa.Uuid(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("description", sa.String(length=1000), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("priority", sa.Integer(), nullable=False, server_default="100"),
            sa.Column("block_unlisted_rooms", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_by", sa.Uuid(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["created_by"], ["users.user_id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("event_id"),
        )

    if "special_event_date_ranges" not in existing_tables:
        op.create_table(
            "special_event_date_ranges",
            sa.Column("range_id", sa.Uuid(), nullable=False),
            sa.Column("event_id", sa.Uuid(), nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["event_id"], ["special_events.event_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("range_id"),
        )
        op.create_index(
            "ix_special_event_date_ranges_event_id",
            "special_event_date_ranges",
            ["event_id"],
        )

    if "special_event_room_configs" not in existing_tables:
        op.create_table(
            "special_event_room_configs",
            sa.Column("config_id", sa.Uuid(), nullable=False),
            sa.Column("event_id", sa.Uuid(), nullable=False),
            sa.Column("room_id", sa.Uuid(), nullable=False),
            sa.Column("special_price_per_day", sa.Numeric(10, 2), nullable=True),
            sa.Column("is_available", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("min_days", sa.Integer(), nullable=True),
            sa.Column("max_days", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["event_id"], ["special_events.event_id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["room_id"], ["rooms.room_id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("config_id"),
            sa.UniqueConstraint("event_id", "room_id", name="uq_event_room_config"),
        )
        op.create_index(
            "ix_special_event_room_configs_event_id",
            "special_event_room_configs",
            ["event_id"],
        )


def downgrade() -> None:
    op.drop_index("ix_special_event_room_configs_event_id", table_name="special_event_room_configs")
    op.drop_table("special_event_room_configs")
    op.drop_index("ix_special_event_date_ranges_event_id", table_name="special_event_date_ranges")
    op.drop_table("special_event_date_ranges")
    op.drop_table("special_events")

"""Add vouchers

Revision ID: 6e60c5c1c599
Revises: 6cfd2f7f2faa
Create Date: 2026-07-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6e60c5c1c599'
down_revision: Union[str, Sequence[str], None] = '6cfd2f7f2faa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'vouchers',
        sa.Column('voucher_id', sa.Uuid(), nullable=False),
        sa.Column('code', sa.String(length=30), nullable=False),
        sa.Column('description', sa.String(length=300), nullable=True),
        sa.Column('discount_type', sa.Enum('PERCENTAGE', 'FLAT', name='voucher_discount_type'), nullable=False),
        sa.Column('discount_value', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('max_discount_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('min_order_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('scope', sa.Enum('ALL', 'BOOKING', 'EVENT', name='voucher_scope'), nullable=False),
        sa.Column('usage_limit', sa.Integer(), nullable=True),
        sa.Column('used_count', sa.Integer(), nullable=False),
        sa.Column('valid_from', sa.DateTime(timezone=True), nullable=True),
        sa.Column('valid_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('created_by', sa.Uuid(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['created_by'], ['users.user_id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('voucher_id'),
    )
    op.create_index(op.f('ix_vouchers_code'), 'vouchers', ['code'], unique=True)

    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('voucher_code', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=True))

    with op.batch_alter_table('event_registrations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('voucher_code', sa.String(length=30), nullable=True))
        batch_op.add_column(sa.Column('discount_amount', sa.Numeric(precision=10, scale=2), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('event_registrations', schema=None) as batch_op:
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('voucher_code')

    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.drop_column('discount_amount')
        batch_op.drop_column('voucher_code')

    op.drop_index(op.f('ix_vouchers_code'), table_name='vouchers')
    op.drop_table('vouchers')

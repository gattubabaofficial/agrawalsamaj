"""Guest Bhavan bookings

Revision ID: 6cfd2f7f2faa
Revises: f7a1c2d3e4b5
Create Date: 2026-07-20 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6cfd2f7f2faa'
down_revision: Union[str, Sequence[str], None] = 'f7a1c2d3e4b5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.add_column(sa.Column('guest_name', sa.String(length=200), nullable=True))
        batch_op.add_column(sa.Column('guest_phone', sa.String(length=20), nullable=True))
        batch_op.alter_column('user_id',
               existing_type=sa.CHAR(length=32),
               nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('bookings', schema=None) as batch_op:
        batch_op.alter_column('user_id',
               existing_type=sa.CHAR(length=32),
               nullable=False)
        batch_op.drop_column('guest_phone')
        batch_op.drop_column('guest_name')

"""add guest author fields to blogs

Revision ID: g1a2b3c4d5e6
Revises: e24bb53f7fdb
Create Date: 2026-08-01 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'g1a2b3c4d5e6'
down_revision: str = None  # will be set by checking the latest
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('blogs', sa.Column('guest_name', sa.String(200), nullable=True))
    op.add_column('blogs', sa.Column('guest_email', sa.String(300), nullable=True))
    op.add_column('blogs', sa.Column('guest_phone', sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column('blogs', 'guest_phone')
    op.drop_column('blogs', 'guest_email')
    op.drop_column('blogs', 'guest_name')

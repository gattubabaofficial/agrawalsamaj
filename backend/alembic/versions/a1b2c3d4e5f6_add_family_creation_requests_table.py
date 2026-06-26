"""add_family_creation_requests_table

Revision ID: a1b2c3d4e5f6
Revises: 4519966f689d
Create Date: 2026-06-25 12:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4519966f689d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the family_creation_requests table."""
    op.create_table(
        'family_creation_requests',
        sa.Column('request_id', sa.Uuid(), nullable=False),
        sa.Column('user_id', sa.Uuid(), nullable=False),
        sa.Column('family_name', sa.String(length=200), nullable=False),
        sa.Column('member_limit', sa.Integer(), nullable=True),
        sa.Column('head_first_name', sa.String(length=100), nullable=False),
        sa.Column('head_surname', sa.String(length=100), nullable=False),
        sa.Column('head_mobile', sa.String(length=20), nullable=True),
        sa.Column('head_email', sa.String(length=255), nullable=True),
        sa.Column('head_profession', sa.String(length=200), nullable=True),
        sa.Column('head_address', sa.String(length=500), nullable=True),
        sa.Column('head_profile_photo', sa.String(length=500), nullable=True),
        sa.Column('members_json', sa.Text(), nullable=True),
        sa.Column(
            'status',
            sa.Enum('pending', 'approved', 'rejected', name='family_creation_request_status'),
            nullable=False,
            server_default='pending'
        ),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('request_id')
    )


def downgrade() -> None:
    """Drop the family_creation_requests table."""
    op.drop_table('family_creation_requests')
    op.execute("DROP TYPE IF EXISTS family_creation_request_status")

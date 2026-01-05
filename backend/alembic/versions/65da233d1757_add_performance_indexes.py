"""add_performance_indexes

Revision ID: 65da233d1757
Revises: 002
Create Date: 2026-01-05 13:54:34.731679

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '65da233d1757'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add index for slug uniqueness checks (speeds up page creation)
    op.create_index('idx_pages_space_slug', 'pages', ['space_id', 'slug'], unique=False)

    # Add index for tree building (speeds up hierarchical queries)
    op.create_index('idx_pages_parent_position', 'pages', ['parent_id', 'position'], unique=False)

    # Add index for space-based queries
    op.create_index('idx_pages_space_status', 'pages', ['space_id', 'status'], unique=False)


def downgrade() -> None:
    # Remove indexes
    op.drop_index('idx_pages_space_status', table_name='pages')
    op.drop_index('idx_pages_parent_position', table_name='pages')
    op.drop_index('idx_pages_space_slug', table_name='pages')


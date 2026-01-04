"""Add version control and approval workflow

Revision ID: 002
Revises: 001
Create Date: 2026-01-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to pages table
    op.add_column('pages', sa.Column('edit_mode', sa.String(length=20), server_default='anyone', nullable=False))
    op.add_column('pages', sa.Column('last_published_at', sa.DateTime(), nullable=True))
    op.add_column('pages', sa.Column('last_published_by', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_pages_last_published_by', 'pages', 'users', ['last_published_by'], ['id'])

    # Add new columns to page_versions table
    op.add_column('page_versions', sa.Column('title', sa.String(length=500), nullable=True))
    op.add_column('page_versions', sa.Column('change_summary', sa.Text(), nullable=True))
    op.add_column('page_versions', sa.Column('is_published', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('page_versions', sa.Column('published_at', sa.DateTime(), nullable=True))

    # Create page_update_requests table
    op.create_table(
        'page_update_requests',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('page_id', sa.Integer(), nullable=False),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('content_json', sa.JSON(), nullable=True),
        sa.Column('content_text', sa.Text(), nullable=True),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'approved', 'rejected', 'cancelled', name='updaterequeststatus'), nullable=False),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('review_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['page_id'], ['pages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requester_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_page_update_requests_page_id'), 'page_update_requests', ['page_id'], unique=False)
    op.create_index(op.f('ix_page_update_requests_requester_id'), 'page_update_requests', ['requester_id'], unique=False)
    op.create_index(op.f('ix_page_update_requests_status'), 'page_update_requests', ['status'], unique=False)

    # Backfill existing page_versions with title from pages
    op.execute("""
        UPDATE page_versions pv
        SET title = (SELECT title FROM pages p WHERE p.id = pv.page_id),
            is_published = true,
            published_at = pv.created_at
        WHERE pv.title IS NULL
    """)


def downgrade() -> None:
    # Drop page_update_requests table
    op.drop_index(op.f('ix_page_update_requests_status'), table_name='page_update_requests')
    op.drop_index(op.f('ix_page_update_requests_requester_id'), table_name='page_update_requests')
    op.drop_index(op.f('ix_page_update_requests_page_id'), table_name='page_update_requests')
    op.drop_table('page_update_requests')

    # Remove columns from page_versions
    op.drop_column('page_versions', 'published_at')
    op.drop_column('page_versions', 'is_published')
    op.drop_column('page_versions', 'change_summary')
    op.drop_column('page_versions', 'title')

    # Remove columns from pages
    op.drop_constraint('fk_pages_last_published_by', 'pages', type_='foreignkey')
    op.drop_column('pages', 'last_published_by')
    op.drop_column('pages', 'last_published_at')
    op.drop_column('pages', 'edit_mode')

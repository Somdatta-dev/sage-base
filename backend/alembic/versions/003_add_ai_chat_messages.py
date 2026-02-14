"""add ai chat messages

Revision ID: 003
Revises: 65da233d1757
Create Date: 2026-02-14 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "003"
down_revision = "65da233d1757"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_chat_messages",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(length=255), nullable=False, server_default="global"),
        sa.Column("page_id", sa.Integer(), nullable=True),
        sa.Column("space_id", sa.Integer(), nullable=True),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("tool_calls", sa.JSON(), nullable=True),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["page_id"], ["pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(op.f("ix_ai_chat_messages_user_id"), "ai_chat_messages", ["user_id"], unique=False)
    op.create_index(op.f("ix_ai_chat_messages_session_id"), "ai_chat_messages", ["session_id"], unique=False)
    op.create_index(op.f("ix_ai_chat_messages_page_id"), "ai_chat_messages", ["page_id"], unique=False)
    op.create_index(op.f("ix_ai_chat_messages_space_id"), "ai_chat_messages", ["space_id"], unique=False)
    op.create_index(op.f("ix_ai_chat_messages_created_at"), "ai_chat_messages", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_ai_chat_messages_created_at"), table_name="ai_chat_messages")
    op.drop_index(op.f("ix_ai_chat_messages_space_id"), table_name="ai_chat_messages")
    op.drop_index(op.f("ix_ai_chat_messages_page_id"), table_name="ai_chat_messages")
    op.drop_index(op.f("ix_ai_chat_messages_session_id"), table_name="ai_chat_messages")
    op.drop_index(op.f("ix_ai_chat_messages_user_id"), table_name="ai_chat_messages")
    op.drop_table("ai_chat_messages")


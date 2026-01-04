from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, JSON, Boolean, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING, Optional
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.space import Space
    from app.models.comment import Comment


class PageStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class EditMode(str, enum.Enum):
    ANYONE = "anyone"
    APPROVAL = "approval"


class UpdateRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class Page(Base):
    __tablename__ = "pages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    space_id: Mapped[int] = mapped_column(ForeignKey("spaces.id"))
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("pages.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(500))
    slug: Mapped[str] = mapped_column(String(500), index=True)
    content_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)  # Plain text for search
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    status: Mapped[PageStatus] = mapped_column(
        SQLEnum(PageStatus, values_callable=lambda x: [e.value for e in x]),
        default=PageStatus.DRAFT
    )
    position: Mapped[int] = mapped_column(Integer, default=0)
    version: Mapped[int] = mapped_column(Integer, default=1)
    edit_mode: Mapped[str] = mapped_column(
        String(20),
        default=EditMode.ANYONE.value
    )
    last_published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_published_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    space: Mapped["Space"] = relationship("Space", back_populates="pages")
    parent: Mapped[Optional["Page"]] = relationship("Page", remote_side=[id], back_populates="children")
    children: Mapped[list["Page"]] = relationship("Page", back_populates="parent")
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="page", cascade="all, delete-orphan")
    versions: Mapped[list["PageVersion"]] = relationship("PageVersion", back_populates="page", cascade="all, delete-orphan")
    update_requests: Mapped[list["PageUpdateRequest"]] = relationship("PageUpdateRequest", back_populates="page", cascade="all, delete-orphan")


class PageVersion(Base):
    __tablename__ = "page_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("pages.id"))
    content_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    version: Mapped[int] = mapped_column(Integer)
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    change_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="versions")


class PageUpdateRequest(Base):
    __tablename__ = "page_update_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    page_id: Mapped[int] = mapped_column(ForeignKey("pages.id", ondelete="CASCADE"), index=True)
    requester_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(500))
    content_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    content_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[UpdateRequestStatus] = mapped_column(
        SQLEnum(UpdateRequestStatus, values_callable=lambda x: [e.value for e in x]),
        default=UpdateRequestStatus.PENDING,
        index=True
    )
    reviewed_by: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    review_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    page: Mapped["Page"] = relationship("Page", back_populates="update_requests")

from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.page import PageStatus, EditMode, UpdateRequestStatus


class PageCreate(BaseModel):
    space_id: int
    parent_id: Optional[int] = None
    title: str
    content_json: Optional[dict] = None
    status: PageStatus = PageStatus.DRAFT


class PageUpdate(BaseModel):
    title: Optional[str] = None
    content_json: Optional[dict] = None
    status: Optional[PageStatus] = None
    parent_id: Optional[int] = None
    position: Optional[int] = None


class PageResponse(BaseModel):
    id: int
    space_id: int
    parent_id: Optional[int] = None
    title: str
    slug: str
    content_json: Optional[dict] = None
    author_id: int
    status: PageStatus
    position: int
    version: int
    edit_mode: EditMode
    last_published_at: Optional[datetime] = None
    last_published_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PageTreeItem(BaseModel):
    id: int
    title: str
    slug: str
    parent_id: Optional[int] = None
    position: int
    status: PageStatus
    children: list["PageTreeItem"] = []

    class Config:
        from_attributes = True


class PageVersionResponse(BaseModel):
    id: int
    page_id: int
    content_json: Optional[dict] = None
    title: Optional[str] = None
    version: int
    author_id: int
    change_summary: Optional[str] = None
    is_published: bool
    published_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PageMoveRequest(BaseModel):
    parent_id: Optional[int] = None
    position: int


class PagePublishRequest(BaseModel):
    change_summary: Optional[str] = None


class PageSettingsUpdate(BaseModel):
    edit_mode: EditMode


class UpdateRequestCreate(BaseModel):
    title: str
    content_json: Optional[dict] = None
    message: Optional[str] = None


class UpdateRequestResponse(BaseModel):
    id: int
    page_id: int
    requester_id: int
    title: str
    content_json: Optional[dict] = None
    content_text: Optional[str] = None
    message: Optional[str] = None
    status: UpdateRequestStatus
    reviewed_by: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    review_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UpdateRequestReview(BaseModel):
    review_message: Optional[str] = None


class DiffResponse(BaseModel):
    from_version: int
    to_version: int
    text_diff: list
    stats: dict

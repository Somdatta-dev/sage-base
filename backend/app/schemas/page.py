from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.page import PageStatus


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
    version: int
    author_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class PageMoveRequest(BaseModel):
    parent_id: Optional[int] = None
    position: int

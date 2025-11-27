from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class SpaceCreate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_private: bool = False


class SpaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    is_private: Optional[bool] = None


class SpaceResponse(BaseModel):
    id: int
    name: str
    key: str
    description: Optional[str] = None
    icon: Optional[str] = None
    owner_id: int
    is_private: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

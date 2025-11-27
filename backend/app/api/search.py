from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.space import Space
from app.models.page import Page
from app.schemas.page import PageResponse
from app.services.embedding import semantic_search

router = APIRouter()


class SemanticSearchResult(BaseModel):
    page_id: int
    title: str
    content_preview: str
    score: float


@router.get("", response_model=List[PageResponse])
async def search_pages(
    q: str = Query(..., min_length=1, description="Search query"),
    space_id: Optional[int] = Query(None, description="Filter by space ID"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full-text search across pages using PostgreSQL.
    Searches in title and content_text fields.
    """
    search_term = f"%{q}%"
    
    query = (
        select(Page)
        .where(
            or_(
                Page.title.ilike(search_term),
                Page.content_text.ilike(search_term)
            )
        )
    )
    
    if space_id:
        query = query.where(Page.space_id == space_id)
    
    result = await db.execute(query.order_by(Page.updated_at.desc()).limit(50))
    pages = result.scalars().all()
    
    # Filter private spaces - need to load space data
    filtered_pages = []
    for page in pages:
        space_result = await db.execute(select(Space).where(Space.id == page.space_id))
        space = space_result.scalar_one_or_none()
        
        if space and (not space.is_private or space.owner_id == current_user.id or current_user.role == "admin"):
            filtered_pages.append(PageResponse.model_validate(page))
    
    return filtered_pages


@router.get("/semantic", response_model=List[SemanticSearchResult])
async def semantic_search_pages(
    q: str = Query(..., min_length=1, description="Search query"),
    space_id: Optional[int] = Query(None, description="Filter by space ID"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    current_user: User = Depends(get_current_user),
):
    """
    Semantic search using vector embeddings.
    Requires OPENAI_API_KEY to be configured.
    """
    results = await semantic_search(q, space_id=space_id, limit=limit)
    return [SemanticSearchResult(**r) for r in results]

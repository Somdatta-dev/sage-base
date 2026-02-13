from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import List, Optional
from pydantic import BaseModel
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin_user
from app.core.config import settings
from app.models.user import User
from app.models.space import Space
from app.models.page import Page, PageStatus
from app.schemas.page import PageResponse
from app.services.embedding import semantic_search, get_collection_info, index_page

router = APIRouter()
logger = logging.getLogger(__name__)


class SemanticSearchStatus(BaseModel):
    enabled: bool
    openai_configured: bool
    qdrant_host: str
    qdrant_port: int
    collection_exists: bool
    points_count: Optional[int] = None
    error: Optional[str] = None


class SemanticSearchResult(BaseModel):
    page_id: int
    title: str
    content_preview: str
    score: float


@router.get("/semantic/status", response_model=SemanticSearchStatus)
async def get_semantic_search_status(
    current_user: User = Depends(get_current_user),
):
    """
    Check if semantic search is configured and available.
    """
    collection_info = await get_collection_info()
    
    return SemanticSearchStatus(
        enabled=bool(settings.OPENAI_API_KEY),
        openai_configured=bool(settings.OPENAI_API_KEY),
        qdrant_host=settings.QDRANT_HOST,
        qdrant_port=settings.QDRANT_PORT,
        collection_exists=collection_info.get("exists", False),
        points_count=collection_info.get("points_count"),
        error=collection_info.get("error"),
    )


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
    logger.info(f"Semantic search API called with q='{q}', space_id={space_id}, limit={limit}")
    results = await semantic_search(q, space_id=space_id, limit=limit)
    logger.info(f"Semantic search API returning {len(results)} results")
    return [SemanticSearchResult(**r) for r in results]


class SemanticSearchDebugResult(BaseModel):
    query: str
    embedding_generated: bool
    embedding_dimensions: Optional[int] = None
    qdrant_connected: bool
    raw_results_count: int
    results: List[SemanticSearchResult]
    error: Optional[str] = None


@router.get("/semantic/debug", response_model=SemanticSearchDebugResult)
async def debug_semantic_search(
    q: str = Query(..., min_length=1, description="Search query"),
    space_id: Optional[int] = Query(None, description="Filter by space ID"),
    limit: int = Query(10, ge=1, le=50, description="Max results"),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Debug endpoint for semantic search. Returns detailed diagnostic info.
    Admin only.
    """
    import traceback
    from app.services.embedding import get_embedding, get_async_qdrant_client, COLLECTION_NAME

    result = SemanticSearchDebugResult(
        query=q,
        embedding_generated=False,
        qdrant_connected=False,
        raw_results_count=0,
        results=[],
    )

    try:
        # Step 1: Generate embedding
        embedding = await get_embedding(q)
        if not embedding:
            result.error = "Failed to generate embedding (OpenAI API may be failing)"
            return result
        result.embedding_generated = True
        result.embedding_dimensions = len(embedding)

        # Step 2: Connect to Qdrant
        client = await get_async_qdrant_client()
        result.qdrant_connected = True

        # Step 3: Build filter
        filter_conditions = None
        if space_id:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_conditions = Filter(
                must=[FieldCondition(key="space_id", match=MatchValue(value=space_id))]
            )

        # Step 4: Query Qdrant
        response = await client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,
            query_filter=filter_conditions,
            limit=limit,
            score_threshold=0.3,
            with_payload=True,
        )

        hits = response.points
        result.raw_results_count = len(hits)

        for hit in hits:
            try:
                result.results.append(SemanticSearchResult(
                    page_id=hit.payload["page_id"],
                    title=hit.payload["title"],
                    content_preview=hit.payload.get("content_preview", ""),
                    score=hit.score,
                ))
            except (KeyError, TypeError) as e:
                result.error = f"Payload processing error: {e}, payload={hit.payload}"

    except Exception as e:
        result.error = f"{type(e).__name__}: {e}\n{traceback.format_exc()}"

    return result


class ReindexResponse(BaseModel):
    success: bool
    message: str
    pages_found: int
    pages_indexed: int
    errors: List[str]


@router.post("/semantic/reindex", response_model=ReindexResponse)
async def reindex_all_pages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Reindex all published pages in the vector store.
    Admin only endpoint.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Semantic search is not available. OPENAI_API_KEY not configured."
        )
    
    # Get all published pages
    result = await db.execute(
        select(Page).where(Page.status == PageStatus.PUBLISHED)
    )
    pages = result.scalars().all()
    
    if not pages:
        return ReindexResponse(
            success=True,
            message="No published pages found to index",
            pages_found=0,
            pages_indexed=0,
            errors=[]
        )
    
    errors = []
    indexed_count = 0
    
    for page in pages:
        try:
            await index_page(
                page_id=page.id,
                title=page.title,
                content_text=page.content_text or "",
                space_id=page.space_id
            )
            indexed_count += 1
            logger.info(f"Indexed page {page.id}: {page.title}")
        except Exception as e:
            error_msg = f"Failed to index page {page.id} ({page.title}): {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
    
    return ReindexResponse(
        success=True,
        message=f"Reindexing complete. Indexed {indexed_count}/{len(pages)} pages.",
        pages_found=len(pages),
        pages_indexed=indexed_count,
        errors=errors
    )

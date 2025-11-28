"""
Document processing API endpoints.
Handles document uploads and processing with Docling.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.page import Page, PageStatus
from app.models.space import Space
from app.services.document_processor import get_document_processor
from slugify import slugify

router = APIRouter()

# Supported file extensions
SUPPORTED_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.xlsx', '.html', '.md', '.txt'}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


class DocumentProcessResponse(BaseModel):
    success: bool
    markdown: str
    text: str
    tables: List[dict]
    metadata: dict
    error: Optional[str] = None


class DocumentToPageResponse(BaseModel):
    success: bool
    page_id: Optional[int] = None
    page_title: Optional[str] = None
    page_slug: Optional[str] = None
    error: Optional[str] = None


@router.post("/process", response_model=DocumentProcessResponse)
async def process_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Process an uploaded document and return its content.
    
    Supports: PDF, DOCX, PPTX, XLSX, HTML, MD, TXT
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Read file content
    content = await file.read()
    
    # Check file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    # Process the document
    processor = get_document_processor()
    result = await processor.process_uploaded_file(content, file.filename or 'document')
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {result.get('error', 'Unknown error')}"
        )
    
    return DocumentProcessResponse(**result)


@router.post("/to-page", response_model=DocumentToPageResponse)
async def document_to_page(
    file: UploadFile = File(...),
    space_id: int = Form(...),
    title: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Convert an uploaded document to a new page in a space.
    
    The document content is converted to the editor format and saved as a page.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}"
        )
    
    # Verify space exists and user has access
    space_result = await db.execute(select(Space).where(Space.id == space_id))
    space = space_result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.is_private and space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Read and process the document
    content = await file.read()
    
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB"
        )
    
    processor = get_document_processor()
    result = await processor.process_uploaded_file(content, file.filename or 'document')
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {result.get('error', 'Unknown error')}"
        )
    
    # Generate page title from filename if not provided
    page_title = title or os.path.splitext(file.filename or 'Imported Document')[0]
    page_slug = slugify(page_title)
    
    # Check for slug conflicts
    existing = await db.execute(
        select(Page).where(Page.space_id == space_id, Page.slug == page_slug)
    )
    if existing.scalar_one_or_none():
        # Add a suffix to make it unique
        import time
        page_slug = f"{page_slug}-{int(time.time())}"
    
    # Convert markdown to Tiptap JSON
    content_json = processor.convert_to_tiptap_json(result['markdown'])
    
    # Create the page
    new_page = Page(
        title=page_title,
        slug=page_slug,
        space_id=space_id,
        owner_id=current_user.id,
        content_json=content_json,
        content_text=result['text'],
        status=PageStatus.DRAFT,
        version=1,
    )
    
    db.add(new_page)
    await db.commit()
    await db.refresh(new_page)
    
    return DocumentToPageResponse(
        success=True,
        page_id=new_page.id,
        page_title=new_page.title,
        page_slug=new_page.slug,
    )


@router.get("/supported-formats")
async def get_supported_formats(
    current_user: User = Depends(get_current_user),
):
    """Get list of supported document formats."""
    return {
        "formats": list(SUPPORTED_EXTENSIONS),
        "max_size_mb": MAX_FILE_SIZE // (1024 * 1024),
    }


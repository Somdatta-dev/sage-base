from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from slugify import slugify
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.space import Space
from app.models.page import Page, PageVersion, PageStatus, PageUpdateRequest, EditMode, UpdateRequestStatus
from app.schemas.page import (
    PageCreate, PageUpdate, PageResponse,
    PageTreeItem, PageVersionResponse, PageMoveRequest,
    PagePublishRequest, PageSettingsUpdate, UpdateRequestCreate,
    UpdateRequestResponse, UpdateRequestReview, DiffResponse
)
from app.services.embedding import update_page_embedding
from app.services.diff import generate_content_diff
from app.services.document_processor import get_document_processor
from pydantic import BaseModel

router = APIRouter()


def extract_text_from_content(content_json: dict) -> str:
    """Extract plain text from editor JSON content for search indexing."""
    if not content_json:
        return ""
    
    def extract_text(node):
        text_parts = []
        if isinstance(node, dict):
            if node.get("type") == "text":
                text_parts.append(node.get("text", ""))
            if "content" in node:
                for child in node["content"]:
                    text_parts.extend(extract_text(child))
        elif isinstance(node, list):
            for item in node:
                text_parts.extend(extract_text(item))
        return text_parts
    
    return " ".join(extract_text(content_json))


def build_page_tree(pages: List[Page], parent_id: Optional[int] = None) -> List[PageTreeItem]:
    """Build hierarchical page tree from flat list."""
    tree = []
    for page in pages:
        if page.parent_id == parent_id:
            item = PageTreeItem(
                id=page.id,
                title=page.title,
                slug=page.slug,
                parent_id=page.parent_id,
                position=page.position,
                status=page.status,
                children=build_page_tree(pages, page.id)
            )
            tree.append(item)
    return sorted(tree, key=lambda x: x.position)


@router.get("/space/{space_id}", response_model=List[PageResponse])
async def list_pages_by_space(
    space_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify space access
    space_result = await db.execute(select(Space).where(Space.id == space_id))
    space = space_result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.is_private and space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.execute(
        select(Page)
        .where(Page.space_id == space_id)
        .order_by(Page.position)
    )
    pages = result.scalars().all()
    
    return [PageResponse.model_validate(page) for page in pages]


@router.get("/space/{space_id}/tree", response_model=List[PageTreeItem])
async def get_page_tree(
    space_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify space exists
    space_result = await db.execute(select(Space).where(Space.id == space_id))
    space = space_result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    result = await db.execute(
        select(Page)
        .where(Page.space_id == space_id)
        .order_by(Page.position)
    )
    pages = result.scalars().all()
    
    return build_page_tree(pages)


@router.post("", response_model=PageResponse, status_code=status.HTTP_201_CREATED)
async def create_page(
    page_data: PageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify space exists
    space_result = await db.execute(select(Space).where(Space.id == page_data.space_id))
    space = space_result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    # Generate unique slug
    base_slug = slugify(page_data.title)
    slug = base_slug
    counter = 1
    while True:
        result = await db.execute(
            select(Page).where(
                and_(Page.space_id == page_data.space_id, Page.slug == slug)
            )
        )
        if not result.scalar_one_or_none():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
    
    # Get max position for ordering
    position_result = await db.execute(
        select(Page.position)
        .where(
            and_(
                Page.space_id == page_data.space_id,
                Page.parent_id == page_data.parent_id
            )
        )
        .order_by(Page.position.desc())
        .limit(1)
    )
    max_position = position_result.scalar() or 0
    
    page = Page(
        space_id=page_data.space_id,
        parent_id=page_data.parent_id,
        title=page_data.title,
        slug=slug,
        content_json=page_data.content_json,
        content_text=extract_text_from_content(page_data.content_json) if page_data.content_json else None,
        author_id=current_user.id,
        status=page_data.status,
        position=max_position + 1,
    )
    db.add(page)
    await db.commit()
    await db.refresh(page)
    
    return PageResponse.model_validate(page)


@router.get("/{page_id}", response_model=PageResponse)
async def get_page(
    page_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return PageResponse.model_validate(page)


@router.get("/space/{space_id}/slug/{slug}", response_model=PageResponse)
async def get_page_by_slug(
    space_id: int,
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Page).where(and_(Page.space_id == space_id, Page.slug == slug))
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    return PageResponse.model_validate(page)


@router.patch("/{page_id}", response_model=PageResponse)
async def update_page(
    page_id: int,
    page_data: PageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update page draft content (does NOT create version or update vector store).
    For publishing changes, use the publish endpoint.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check edit permissions
    space_result = await db.execute(select(Space).where(Space.id == page.space_id))
    space = space_result.scalar_one_or_none()

    is_page_owner = page.author_id == current_user.id
    is_space_owner = space.owner_id == current_user.id if space else False
    is_admin = current_user.role == "admin"

    # If page requires approval and user is not owner/admin, reject direct edit
    if page.edit_mode == EditMode.APPROVAL.value and not (is_page_owner or is_space_owner or is_admin):
        raise HTTPException(
            status_code=403,
            detail="This page requires approval. Please submit an update request instead."
        )

    update_data = page_data.model_dump(exclude_unset=True)

    # Update title slug if title changed
    if "title" in update_data and update_data["title"] != page.title:
        base_slug = slugify(update_data["title"])
        slug = base_slug
        counter = 1
        while True:
            check_result = await db.execute(
                select(Page).where(
                    and_(
                        Page.space_id == page.space_id,
                        Page.slug == slug,
                        Page.id != page_id
                    )
                )
            )
            if not check_result.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        update_data["slug"] = slug

    # Extract text for search if content updated
    if "content_json" in update_data:
        update_data["content_text"] = extract_text_from_content(update_data["content_json"])

    for field, value in update_data.items():
        setattr(page, field, value)

    await db.commit()
    await db.refresh(page)

    return PageResponse.model_validate(page)


@router.post("/{page_id}/move", response_model=PageResponse)
async def move_page(
    page_id: int,
    move_data: PageMoveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page.parent_id = move_data.parent_id
    page.position = move_data.position
    
    await db.commit()
    await db.refresh(page)
    
    return PageResponse.model_validate(page)


@router.delete("/{page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_page(
    page_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    await db.delete(page)
    await db.commit()


@router.get("/{page_id}/versions", response_model=List[PageVersionResponse])
async def get_page_versions(
    page_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PageVersion)
        .where(PageVersion.page_id == page_id)
        .order_by(PageVersion.version.desc())
    )
    versions = result.scalars().all()
    
    return [PageVersionResponse.model_validate(v) for v in versions]


@router.get("/{page_id}/versions/{version}", response_model=PageVersionResponse)
async def get_page_version(
    page_id: int,
    version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(PageVersion)
        .where(and_(PageVersion.page_id == page_id, PageVersion.version == version))
    )
    page_version = result.scalar_one_or_none()

    if not page_version:
        raise HTTPException(status_code=404, detail="Version not found")

    return PageVersionResponse.model_validate(page_version)


@router.post("/{page_id}/publish", response_model=PageResponse)
async def publish_page(
    page_id: int,
    publish_data: PagePublishRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Publish a page: creates version, updates vector store, changes status to published.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check permissions
    space_result = await db.execute(select(Space).where(Space.id == page.space_id))
    space = space_result.scalar_one_or_none()

    is_page_owner = page.author_id == current_user.id
    is_space_owner = space.owner_id == current_user.id if space else False
    is_admin = current_user.role == "admin"

    if not (is_page_owner or is_space_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only page/space owner can publish")

    # Create version snapshot
    version = PageVersion(
        page_id=page.id,
        content_json=page.content_json,
        title=page.title,
        version=page.version + 1,
        author_id=current_user.id,
        change_summary=publish_data.change_summary,
        is_published=True,
        published_at=datetime.utcnow(),
    )
    db.add(version)

    # Update page
    page.version = page.version + 1
    page.status = PageStatus.PUBLISHED
    page.last_published_at = datetime.utcnow()
    page.last_published_by = current_user.id

    await db.commit()
    await db.refresh(page)

    # Update vector store (async, don't block on errors)
    try:
        await update_page_embedding(
            page_id=page.id,
            title=page.title,
            content_text=page.content_text or "",
            space_id=page.space_id
        )
    except Exception as e:
        # Log but don't fail the publish
        print(f"Warning: Failed to update vector store: {e}")

    return PageResponse.model_validate(page)


@router.post("/{page_id}/unpublish", response_model=PageResponse)
async def unpublish_page(
    page_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Unpublish a page (change status to draft). Does NOT create version.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check permissions
    space_result = await db.execute(select(Space).where(Space.id == page.space_id))
    space = space_result.scalar_one_or_none()

    is_page_owner = page.author_id == current_user.id
    is_space_owner = space.owner_id == current_user.id if space else False
    is_admin = current_user.role == "admin"

    if not (is_page_owner or is_space_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only page/space owner can unpublish")

    page.status = PageStatus.DRAFT

    await db.commit()
    await db.refresh(page)

    return PageResponse.model_validate(page)


@router.patch("/{page_id}/settings", response_model=PageResponse)
async def update_page_settings(
    page_id: int,
    settings: PageSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update page settings (edit mode). Only page owner or admin can change.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check permissions - only page owner or admin
    is_page_owner = page.author_id == current_user.id
    is_admin = current_user.role == "admin"

    if not (is_page_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only page owner can change settings")

    page.edit_mode = settings.edit_mode

    await db.commit()
    await db.refresh(page)

    return PageResponse.model_validate(page)


@router.get("/{page_id}/diff/{from_version}/{to_version}", response_model=DiffResponse)
async def get_version_diff(
    page_id: int,
    from_version: int,
    to_version: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get diff between two page versions.
    """
    # Get both versions
    from_result = await db.execute(
        select(PageVersion)
        .where(and_(PageVersion.page_id == page_id, PageVersion.version == from_version))
    )
    from_ver = from_result.scalar_one_or_none()

    to_result = await db.execute(
        select(PageVersion)
        .where(and_(PageVersion.page_id == page_id, PageVersion.version == to_version))
    )
    to_ver = to_result.scalar_one_or_none()

    if not from_ver or not to_ver:
        raise HTTPException(status_code=404, detail="Version not found")

    # Generate diff
    diff_data = generate_content_diff(
        old_content=from_ver.content_json or {},
        new_content=to_ver.content_json or {},
        old_title=from_ver.title or "",
        new_title=to_ver.title or ""
    )

    return DiffResponse(
        from_version=from_version,
        to_version=to_version,
        text_diff=diff_data["text_diff"],
        stats=diff_data["stats"]
    )


@router.post("/{page_id}/update-requests", response_model=UpdateRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_update_request(
    page_id: int,
    request_data: UpdateRequestCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create an update request for a page that requires approval.
    """
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Extract text for preview
    content_text = extract_text_from_content(request_data.content_json) if request_data.content_json else None

    update_request = PageUpdateRequest(
        page_id=page_id,
        requester_id=current_user.id,
        title=request_data.title,
        content_json=request_data.content_json,
        content_text=content_text,
        message=request_data.message,
        status=UpdateRequestStatus.PENDING
    )
    db.add(update_request)
    await db.commit()
    await db.refresh(update_request)

    return UpdateRequestResponse.model_validate(update_request)


@router.get("/{page_id}/update-requests", response_model=List[UpdateRequestResponse])
async def get_page_update_requests(
    page_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all update requests for a page.
    """
    result = await db.execute(
        select(PageUpdateRequest)
        .where(PageUpdateRequest.page_id == page_id)
        .order_by(PageUpdateRequest.created_at.desc())
    )
    requests = result.scalars().all()

    return [UpdateRequestResponse.model_validate(r) for r in requests]


@router.get("/update-requests/pending", response_model=List[UpdateRequestResponse])
async def get_my_pending_update_requests(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all pending update requests for pages owned by current user.
    """
    result = await db.execute(
        select(PageUpdateRequest)
        .join(Page, PageUpdateRequest.page_id == Page.id)
        .where(
            and_(
                Page.author_id == current_user.id,
                PageUpdateRequest.status == UpdateRequestStatus.PENDING
            )
        )
        .order_by(PageUpdateRequest.created_at.desc())
    )
    requests = result.scalars().all()

    return [UpdateRequestResponse.model_validate(r) for r in requests]


@router.patch("/update-requests/{request_id}/approve", response_model=UpdateRequestResponse)
async def approve_update_request(
    request_id: int,
    review: UpdateRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Approve an update request and apply changes (auto-publish).
    """
    result = await db.execute(
        select(PageUpdateRequest).where(PageUpdateRequest.id == request_id)
    )
    update_request = result.scalar_one_or_none()

    if not update_request:
        raise HTTPException(status_code=404, detail="Update request not found")

    # Get the page
    page_result = await db.execute(select(Page).where(Page.id == update_request.page_id))
    page = page_result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check permissions - must be page owner or admin
    is_page_owner = page.author_id == current_user.id
    is_admin = current_user.role == "admin"

    if not (is_page_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only page owner can approve requests")

    # Create version snapshot of current state
    old_version = PageVersion(
        page_id=page.id,
        content_json=page.content_json,
        title=page.title,
        version=page.version,
        author_id=page.author_id,
        change_summary="Pre-approval snapshot",
        is_published=False,
        published_at=None,
    )
    db.add(old_version)

    # Apply changes
    page.title = update_request.title
    page.content_json = update_request.content_json
    page.content_text = update_request.content_text
    page.status = PageStatus.PUBLISHED
    page.version = page.version + 1
    page.last_published_at = datetime.utcnow()
    page.last_published_by = current_user.id

    # Update slug if needed
    if page.title != update_request.title:
        base_slug = slugify(update_request.title)
        slug = base_slug
        counter = 1
        while True:
            check_result = await db.execute(
                select(Page).where(
                    and_(
                        Page.space_id == page.space_id,
                        Page.slug == slug,
                        Page.id != page.id
                    )
                )
            )
            if not check_result.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        page.slug = slug

    # Create published version
    new_version = PageVersion(
        page_id=page.id,
        content_json=page.content_json,
        title=page.title,
        version=page.version,
        author_id=update_request.requester_id,  # Credit the requester
        change_summary=f"Approved update request: {update_request.message or 'No message'}",
        is_published=True,
        published_at=datetime.utcnow(),
    )
    db.add(new_version)

    # Update request status
    update_request.status = UpdateRequestStatus.APPROVED
    update_request.reviewed_by = current_user.id
    update_request.reviewed_at = datetime.utcnow()
    update_request.review_message = review.review_message

    await db.commit()
    await db.refresh(update_request)
    await db.refresh(page)

    # Update vector store
    try:
        await update_page_embedding(
            page_id=page.id,
            title=page.title,
            content_text=page.content_text or "",
            space_id=page.space_id
        )
    except Exception as e:
        print(f"Warning: Failed to update vector store: {e}")

    return UpdateRequestResponse.model_validate(update_request)


@router.patch("/update-requests/{request_id}/reject", response_model=UpdateRequestResponse)
async def reject_update_request(
    request_id: int,
    review: UpdateRequestReview,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Reject an update request.
    """
    result = await db.execute(
        select(PageUpdateRequest).where(PageUpdateRequest.id == request_id)
    )
    update_request = result.scalar_one_or_none()

    if not update_request:
        raise HTTPException(status_code=404, detail="Update request not found")

    # Get the page
    page_result = await db.execute(select(Page).where(Page.id == update_request.page_id))
    page = page_result.scalar_one_or_none()

    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Check permissions - must be page owner or admin
    is_page_owner = page.author_id == current_user.id
    is_admin = current_user.role == "admin"

    if not (is_page_owner or is_admin):
        raise HTTPException(status_code=403, detail="Only page owner can reject requests")

    update_request.status = UpdateRequestStatus.REJECTED
    update_request.reviewed_by = current_user.id
    update_request.reviewed_at = datetime.utcnow()
    update_request.review_message = review.review_message

    await db.commit()
    await db.refresh(update_request)

    return UpdateRequestResponse.model_validate(update_request)


class AppendContentRequest(BaseModel):
    content: str


@router.post("/{page_id}/append", response_model=PageResponse)
async def append_page_content(
    page_id: int,
    request: AppendContentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Append markdown content to a page.
    """
    # Fetch page
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
        
    # Check permissions
    is_owner = page.author_id == current_user.id
    is_admin = current_user.role == "admin"
    can_edit = is_owner or is_admin or page.edit_mode == "anyone"
    
    if not can_edit:
         raise HTTPException(status_code=403, detail="Permission denied")

    # Process content
    processor = get_document_processor()
    # Convert new content to JSON
    new_json = processor.convert_to_tiptap_json(request.content)
    
    # Merge
    if not page.content_json or not page.content_json.get("content"):
        page.content_json = new_json
    else:
        # Deep copy to ensure mutation is detected if needed, though simple dict assignment works usually
        import copy
        current_data = copy.deepcopy(page.content_json)
        current_content = current_data.get("content", [])
        new_content = new_json.get("content", [])
        
        # Append
        current_content.extend(new_content)
        current_data["content"] = current_content
        
        # Assign back
        page.content_json = current_data
        
    # Update text representation
    existing_text = page.content_text or ""
    page.content_text = existing_text + "\n\n" + request.content
    
    page.updated_at = datetime.utcnow()
    page.version += 1
    
    await db.commit()
    await db.refresh(page)
    
    # Update embedding async
    try:
        await update_page_embedding(
            page_id=page.id,
            title=page.title,
            content_text=page.content_text,
            space_id=page.space_id
        )
    except:
        pass
    
    return page


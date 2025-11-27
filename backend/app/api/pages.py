from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List, Optional
from slugify import slugify

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.space import Space
from app.models.page import Page, PageVersion, PageStatus
from app.schemas.page import (
    PageCreate, PageUpdate, PageResponse, 
    PageTreeItem, PageVersionResponse, PageMoveRequest
)

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
    result = await db.execute(select(Page).where(Page.id == page_id))
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Save version before update if content changed
    update_data = page_data.model_dump(exclude_unset=True)
    if "content_json" in update_data and page.content_json:
        version = PageVersion(
            page_id=page.id,
            content_json=page.content_json,
            version=page.version,
            author_id=current_user.id,
        )
        db.add(version)
        update_data["version"] = page.version + 1
    
    # Update title slug if title changed
    if "title" in update_data and update_data["title"] != page.title:
        base_slug = slugify(update_data["title"])
        slug = base_slug
        counter = 1
        while True:
            result = await db.execute(
                select(Page).where(
                    and_(
                        Page.space_id == page.space_id,
                        Page.slug == slug,
                        Page.id != page_id
                    )
                )
            )
            if not result.scalar_one_or_none():
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

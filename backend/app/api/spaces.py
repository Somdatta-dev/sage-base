from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.space import Space
from app.schemas.space import SpaceCreate, SpaceUpdate, SpaceResponse

router = APIRouter()


@router.get("", response_model=List[SpaceResponse])
async def list_spaces(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Space).order_by(Space.name))
    spaces = result.scalars().all()
    
    # Filter private spaces if not owner or admin
    return [
        SpaceResponse.model_validate(space)
        for space in spaces
        if not space.is_private or space.owner_id == current_user.id or current_user.role == "admin"
    ]


@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
async def create_space(
    space_data: SpaceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Check if key already exists
    result = await db.execute(select(Space).where(Space.key == space_data.key.upper()))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Space key already exists"
        )
    
    space = Space(
        name=space_data.name,
        key=space_data.key.upper(),
        description=space_data.description,
        icon=space_data.icon,
        owner_id=current_user.id,
        is_private=space_data.is_private,
    )
    db.add(space)
    await db.commit()
    await db.refresh(space)
    
    return SpaceResponse.model_validate(space)


@router.get("/{space_id}", response_model=SpaceResponse)
async def get_space(
    space_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Space).where(Space.id == space_id))
    space = result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.is_private and space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return SpaceResponse.model_validate(space)


@router.get("/key/{space_key}", response_model=SpaceResponse)
async def get_space_by_key(
    space_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Space).where(Space.key == space_key.upper()))
    space = result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.is_private and space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return SpaceResponse.model_validate(space)


@router.patch("/{space_id}", response_model=SpaceResponse)
async def update_space(
    space_id: int,
    space_data: SpaceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Space).where(Space.id == space_id))
    space = result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only owner can update space")
    
    update_data = space_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(space, field, value)
    
    await db.commit()
    await db.refresh(space)
    
    return SpaceResponse.model_validate(space)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_space(
    space_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Space).where(Space.id == space_id))
    space = result.scalar_one_or_none()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only owner can delete space")
    
    await db.delete(space)
    await db.commit()

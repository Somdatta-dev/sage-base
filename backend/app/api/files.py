from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import os
import uuid
import aiofiles
from datetime import datetime

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".md"}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"File type {ext} not allowed")
    
    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail="File too large")
    
    # Generate unique filename
    date_path = datetime.now().strftime("%Y/%m")
    unique_name = f"{uuid.uuid4().hex}{ext}"
    relative_path = f"{date_path}/{unique_name}"
    
    # Create directory structure
    full_dir = os.path.join(settings.UPLOAD_DIR, date_path)
    os.makedirs(full_dir, exist_ok=True)
    
    # Save file
    full_path = os.path.join(settings.UPLOAD_DIR, relative_path)
    async with aiofiles.open(full_path, "wb") as f:
        await f.write(content)
    
    return {
        "filename": file.filename,
        "path": relative_path,
        "url": f"/uploads/{relative_path}",
        "size": len(content),
        "content_type": file.content_type,
    }


@router.delete("/{path:path}")
async def delete_file(
    path: str,
    current_user: User = Depends(get_current_user),
):
    full_path = os.path.join(settings.UPLOAD_DIR, path)
    
    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security: ensure path is within upload directory
    if not os.path.realpath(full_path).startswith(os.path.realpath(settings.UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    os.remove(full_path)
    return {"message": "File deleted"}

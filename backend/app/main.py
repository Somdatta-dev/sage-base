from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.api import auth, users, spaces, pages, files, search, ai, documents
from app.core.config import settings
from app.core.init_db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create upload directory
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Initialize database with default admin
    await init_db()
    yield


app = FastAPI(
    title="SageBase API",
    description="Internal Knowledge Base API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.WEBSITE_DOMAIN,
        "http://localhost:3737",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(spaces.router, prefix="/api/spaces", tags=["Spaces"])
app.include_router(pages.router, prefix="/api/pages", tags=["Pages"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])


@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "sagebase-api"}

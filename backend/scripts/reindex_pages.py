"""
Re-index all published pages in Qdrant vector store.
Run this script after deploying version control feature to ensure all existing pages are indexed.
"""
import asyncio
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.page import Page, PageStatus
from app.services.embedding import update_page_embedding


async def reindex_all_pages():
    """Re-index all published pages in the vector store."""
    async with SessionLocal() as db:
        # Get all published pages
        result = await db.execute(
            select(Page).where(Page.status == PageStatus.PUBLISHED)
        )
        pages = result.scalars().all()

        print(f"Found {len(pages)} published pages to re-index...")

        success_count = 0
        error_count = 0

        for page in pages:
            try:
                await update_page_embedding(
                    page_id=page.id,
                    title=page.title,
                    content_text=page.content_text or "",
                    space_id=page.space_id
                )
                success_count += 1
                print(f"✓ Indexed page {page.id}: {page.title}")
            except Exception as e:
                error_count += 1
                print(f"✗ Failed to index page {page.id}: {e}")

        print(f"\nRe-indexing complete!")
        print(f"Success: {success_count}, Errors: {error_count}")


if __name__ == "__main__":
    asyncio.run(reindex_all_pages())

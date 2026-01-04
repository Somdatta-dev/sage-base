from typing import List, Optional
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import openai
from app.core.config import settings

# Qdrant collection name
COLLECTION_NAME = "sagebase_pages"


def get_qdrant_client() -> QdrantClient:
    """Get synchronous Qdrant client."""
    return QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)


async def get_async_qdrant_client() -> AsyncQdrantClient:
    """Get async Qdrant client."""
    return AsyncQdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)


async def ensure_collection_exists(client: AsyncQdrantClient):
    """Create collection if it doesn't exist."""
    collections = await client.get_collections()
    collection_names = [c.name for c in collections.collections]
    
    if COLLECTION_NAME not in collection_names:
        await client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=settings.EMBEDDING_DIMENSIONS,
                distance=Distance.COSINE
            )
        )


async def get_embedding(text: str) -> Optional[List[float]]:
    """Get embedding from OpenAI."""
    if not settings.OPENAI_API_KEY:
        return None
    
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text
    )
    
    return response.data[0].embedding


async def index_page(page_id: int, title: str, content_text: str, space_id: int):
    """Index a page in Qdrant for semantic search."""
    if not settings.OPENAI_API_KEY:
        return
    
    text = f"{title}\n\n{content_text}"
    embedding = await get_embedding(text)
    
    if not embedding:
        return
    
    client = await get_async_qdrant_client()
    await ensure_collection_exists(client)
    
    await client.upsert(
        collection_name=COLLECTION_NAME,
        points=[
            PointStruct(
                id=page_id,
                vector=embedding,
                payload={
                    "page_id": page_id,
                    "title": title,
                    "space_id": space_id,
                    "content_preview": content_text[:500] if content_text else ""
                }
            )
        ]
    )


async def update_page_embedding(page_id: int, title: str, content_text: str, space_id: int):
    """
    Update existing page embedding in Qdrant.
    This is an alias for index_page since upsert handles both create and update.
    Called when a page is published to keep vector store in sync.
    """
    await index_page(page_id, title, content_text, space_id)


async def delete_page_from_index(page_id: int):
    """Remove a page from Qdrant index."""
    if not settings.OPENAI_API_KEY:
        return

    client = await get_async_qdrant_client()

    try:
        await client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=[page_id]
        )
    except Exception:
        pass  # Collection might not exist yet


async def semantic_search(query: str, space_id: Optional[int] = None, limit: int = 10) -> List[dict]:
    """Perform semantic search using embeddings."""
    if not settings.OPENAI_API_KEY:
        return []
    
    embedding = await get_embedding(query)
    if not embedding:
        return []
    
    client = await get_async_qdrant_client()
    
    try:
        filter_conditions = None
        if space_id:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_conditions = Filter(
                must=[
                    FieldCondition(key="space_id", match=MatchValue(value=space_id))
                ]
            )
        
        results = await client.search(
            collection_name=COLLECTION_NAME,
            query_vector=embedding,
            query_filter=filter_conditions,
            limit=limit
        )
        
        return [
            {
                "page_id": hit.payload["page_id"],
                "title": hit.payload["title"],
                "content_preview": hit.payload.get("content_preview", ""),
                "score": hit.score
            }
            for hit in results
        ]
    except Exception:
        return []


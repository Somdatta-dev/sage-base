from typing import List, Optional
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import openai
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Qdrant collection name
COLLECTION_NAME = "sagebase_pages"


def get_qdrant_client() -> QdrantClient:
    """Get synchronous Qdrant client."""
    return QdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        api_key=settings.QDRANT_API_KEY or None,
        https=settings.QDRANT_HTTPS,
        timeout=5,
    )


async def get_async_qdrant_client() -> AsyncQdrantClient:
    """Get async Qdrant client."""
    return AsyncQdrantClient(
        host=settings.QDRANT_HOST,
        port=settings.QDRANT_PORT,
        api_key=settings.QDRANT_API_KEY or None,
        https=settings.QDRANT_HTTPS,
        timeout=5,
    )


async def get_collection_info() -> dict:
    """Get information about the Qdrant collection."""
    if not settings.OPENAI_API_KEY:
        return {"exists": False, "error": "OPENAI_API_KEY not configured"}
    
    try:
        client = await get_async_qdrant_client()
        collections = await client.get_collections()
        collection_names = [c.name for c in collections.collections]
        
        if COLLECTION_NAME not in collection_names:
            logger.info(f"Collection {COLLECTION_NAME} not found. Existing collections: {collection_names}")
            return {"exists": False, "collection_name": COLLECTION_NAME}
        
        # Get collection stats
        collection_info = await client.get_collection(COLLECTION_NAME)
        logger.info(f"Collection {COLLECTION_NAME} found with {collection_info.points_count} points")
        return {
            "exists": True,
            "collection_name": COLLECTION_NAME,
            "points_count": collection_info.points_count,
            "status": collection_info.status.value if hasattr(collection_info.status, 'value') else str(collection_info.status),
        }
    except Exception as e:
        logger.error(f"Failed to get collection info: {type(e).__name__}: {e}")
        return {"exists": False, "error": f"{type(e).__name__}: {str(e)}"}


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

    client = openai.AsyncOpenAI(
        api_key=settings.OPENAI_API_KEY,
        base_url=settings.OPENAI_BASE_URL
    )

    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
        dimensions=settings.EMBEDDING_DIMENSIONS
    )

    return response.data[0].embedding


async def index_page(page_id: int, title: str, content_text: str, space_id: int):
    """Index a page in Qdrant for semantic search."""
    import logging
    logger = logging.getLogger(__name__)
    
    if not settings.OPENAI_API_KEY:
        logger.debug(f"Skipping index for page {page_id}: OPENAI_API_KEY not configured")
        return
    
    try:
        text = f"{title}\n\n{content_text}"
        embedding = await get_embedding(text)
        
        if not embedding:
            logger.warning(f"Failed to generate embedding for page {page_id}")
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
        logger.info(f"Successfully indexed page {page_id}: {title}")
    except Exception as e:
        logger.error(f"Failed to index page {page_id}: {type(e).__name__}: {e}")


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
    import logging
    import traceback
    logger = logging.getLogger(__name__)

    if not settings.OPENAI_API_KEY:
        logger.warning("Semantic search skipped: OPENAI_API_KEY not configured")
        return []

    try:
        logger.info(f"Semantic search starting for query: '{query[:50]}', space_id={space_id}")

        embedding = await get_embedding(query)
        if not embedding:
            logger.warning("Semantic search failed: Could not generate embedding for query")
            return []

        logger.info(f"Generated embedding with {len(embedding)} dimensions")

        client = await get_async_qdrant_client()

        filter_conditions = None
        if space_id:
            from qdrant_client.models import Filter, FieldCondition, MatchValue
            filter_conditions = Filter(
                must=[
                    FieldCondition(key="space_id", match=MatchValue(value=space_id))
                ]
            )

        # Use query_points (client.search was removed in qdrant-client v1.15+)
        response = await client.query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,
            query_filter=filter_conditions,
            limit=limit,
            score_threshold=0.3,
            with_payload=True,
        )

        results = response.points
        logger.info(f"Qdrant returned {len(results)} raw results for query: '{query[:50]}'")
        for hit in results:
            logger.info(f"  Hit: score={hit.score}, payload_keys={list(hit.payload.keys()) if hit.payload else 'None'}")

        search_results = []
        for hit in results:
            try:
                search_results.append({
                    "page_id": hit.payload["page_id"],
                    "title": hit.payload["title"],
                    "content_preview": hit.payload.get("content_preview", ""),
                    "score": hit.score
                })
            except (KeyError, TypeError) as e:
                logger.error(f"Failed to process hit payload: {e}, payload={hit.payload}")
                continue

        return search_results
    except Exception as e:
        logger.error(f"Semantic search error: {type(e).__name__}: {e}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return []


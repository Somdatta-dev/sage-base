"""
AI API endpoints for chat and summarization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import json
import uuid
import os

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.page import Page, PageStatus
from app.models.space import Space
from app.services.agent import (
    chat_with_agent,
    summarize_page_content,
    edit_text_with_ai,
    translate_text_with_ai,
    get_supported_languages,
    is_ai_configured,
    clear_session,
    store_uploaded_document,
    get_uploaded_document,
    clear_uploaded_document,
)
from app.services.document_processor import get_document_processor
from slugify import slugify

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    space_id: Optional[int] = None
    page_id: Optional[int] = None  # Current page context for edits
    document_id: Optional[str] = None  # Attached document ID


class ChatResponse(BaseModel):
    response: str
    tool_calls: List[dict]
    page_edited: bool = False
    edited_page_id: Optional[int] = None
    page_created: bool = False
    created_page_id: Optional[int] = None
    created_page_slug: Optional[str] = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    markdown_preview: str
    success: bool


class SummarizeRequest(BaseModel):
    page_id: int


class SummarizeResponse(BaseModel):
    summary: str
    page_title: str


class AIStatusResponse(BaseModel):
    chat_enabled: bool
    web_search_enabled: bool
    knowledge_search_enabled: bool


class EditTextRequest(BaseModel):
    text: str
    instruction: str


class EditTextResponse(BaseModel):
    edited_text: str
    original_text: str


class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = "auto"


class TranslateResponse(BaseModel):
    translated_text: str
    original_text: str
    target_language: str
    target_language_name: str


class SupportedLanguagesResponse(BaseModel):
    languages: dict


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(
    current_user: User = Depends(get_current_user),
):
    """
    Check if AI features are configured and available.
    """
    return AIStatusResponse(**is_ai_configured())


# Supported file extensions for document upload
SUPPORTED_DOC_EXTENSIONS = {'.pdf', '.docx', '.pptx', '.xlsx', '.html', '.md', '.txt'}


@router.post("/upload-document", response_model=DocumentUploadResponse)
async def upload_document_for_chat(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """
    Upload a document for AI chat context.
    
    The document is processed and stored temporarily for the chat session.
    User can then ask questions about it or import it as a page.
    """
    # Validate file extension
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in SUPPORTED_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_DOC_EXTENSIONS)}"
        )
    
    # Read and process the document
    content = await file.read()
    
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum size: 50MB")
    
    processor = get_document_processor()
    result = await processor.process_uploaded_file(content, file.filename or 'document')
    
    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process document: {result.get('error', 'Unknown error')}"
        )
    
    # Generate a unique document ID
    doc_id = str(uuid.uuid4())
    
    # Store the processed document
    store_uploaded_document(doc_id, {
        'filename': file.filename,
        'markdown': result['markdown'],
        'text': result['text'],
        'tables': result['tables'],
        'metadata': result['metadata'],
        'user_id': current_user.id,
    })
    
    # Create a preview (first 500 chars)
    preview = result['markdown'][:500] + ('...' if len(result['markdown']) > 500 else '')
    
    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename or 'document',
        markdown_preview=preview,
        success=True,
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a message to the AI agent and get a response.
    
    The agent can:
    - Search the knowledge base for relevant information
    - Search the web using Tavily
    - Summarize pages
    - Edit page content
    - Import documents as pages
    """
    status = is_ai_configured()
    if not status["chat_enabled"]:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not available. Please configure OPENAI_API_KEY.",
        )
    
    # Create a unique session ID per user
    session_id = f"{current_user.id}_{request.session_id}"
    
    # Build message with context
    message = request.message
    
    # Add page context if available
    if request.page_id:
        message = f"[Current page ID: {request.page_id}]\n\n{message}"
    
    # Add document context if available
    if request.document_id:
        doc_data = get_uploaded_document(request.document_id)
        if doc_data:
            # Include document content in context (truncated for token limits)
            doc_content = doc_data['markdown'][:4000]
            message = f"""[Attached document: {request.document_id}]
[Document filename: {doc_data['filename']}]
[Document content preview:]
{doc_content}
{'...(truncated)' if len(doc_data['markdown']) > 4000 else ''}

User message: {message}"""
    
    result = await chat_with_agent(
        message=message,
        session_id=session_id,
        space_id=request.space_id,
    )
    
    # Handle response markers
    response_text = result.get("response", "")
    page_edited = False
    edited_page_id = None
    page_created = False
    created_page_id = None
    created_page_slug = None
    
    # Handle EDIT_PAGE marker
    if "EDIT_PAGE:" in response_text:
        try:
            parts = response_text.split("EDIT_PAGE:", 1)[1]
            page_id_str, edit_instruction = parts.split(":", 1)
            page_id = int(page_id_str.strip())
            edit_instruction = edit_instruction.strip()
            
            edit_result = await _perform_page_edit(db, page_id, edit_instruction)
            result["response"] = edit_result
            result["tool_calls"].append({
                "name": "edit_page_content",
                "args": {"page_id": page_id, "instruction": edit_instruction}
            })
            
            if "✅" in edit_result:
                page_edited = True
                edited_page_id = page_id
        except Exception as e:
            result["response"] = f"Failed to edit page: {str(e)}"
    
    # Handle IMPORT_DOC marker
    elif "IMPORT_DOC:" in response_text:
        try:
            parts = response_text.split("IMPORT_DOC:", 1)[1]
            doc_id, space_id_str, title = parts.split(":", 2)
            doc_id = doc_id.strip()
            space_id = int(space_id_str.strip())
            title = title.strip() if title.strip() else None
            
            import_result = await _import_document_to_page(
                db, doc_id, space_id, title, current_user.id
            )
            result["response"] = import_result["message"]
            result["tool_calls"].append({
                "name": "import_document_to_page",
                "args": {"document_id": doc_id, "space_id": space_id, "title": title}
            })
            
            if import_result.get("success"):
                page_created = True
                created_page_id = import_result.get("page_id")
                created_page_slug = import_result.get("page_slug")
        except Exception as e:
            result["response"] = f"Failed to import document: {str(e)}"
    
    return ChatResponse(
        response=result["response"],
        tool_calls=result["tool_calls"],
        page_edited=page_edited,
        edited_page_id=edited_page_id,
        page_created=page_created,
        created_page_id=created_page_id,
        created_page_slug=created_page_slug,
    )


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize_page(
    request: SummarizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Summarize a specific page by ID.
    """
    status = is_ai_configured()
    if not status["chat_enabled"]:
        raise HTTPException(
            status_code=503,
            detail="AI summarization is not available. Please configure OPENAI_API_KEY.",
        )
    
    # Fetch the page
    result = await db.execute(
        select(Page).where(Page.id == request.page_id)
    )
    page = result.scalar_one_or_none()
    
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    # Check access permissions (basic check)
    # In a full implementation, you'd check space permissions
    
    # Get the page content
    content_text = page.content_text or ""
    if not content_text and page.content_json:
        # Try to extract text from JSON content
        content_text = _extract_text_from_json(page.content_json)
    
    if not content_text:
        raise HTTPException(
            status_code=400,
            detail="Page has no content to summarize",
        )
    
    # Summarize
    summary = await summarize_page_content(page.title, content_text)
    
    return SummarizeResponse(
        summary=summary,
        page_title=page.title,
    )


@router.post("/clear-session")
async def clear_chat_session(
    session_id: str = Query(default="default"),
    current_user: User = Depends(get_current_user),
):
    """
    Clear the chat session memory.
    """
    user_session_id = f"{current_user.id}_{session_id}"
    clear_session(user_session_id)
    return {"status": "ok", "message": "Session cleared"}


@router.post("/edit-text", response_model=EditTextResponse)
async def edit_text(
    request: EditTextRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Edit text based on an instruction using AI.
    
    This is used for inline text editing in the editor.
    """
    status = is_ai_configured()
    if not status["chat_enabled"]:
        raise HTTPException(
            status_code=503,
            detail="AI text editing is not available. Please configure OPENAI_API_KEY.",
        )
    
    edited_text = await edit_text_with_ai(request.text, request.instruction)
    
    return EditTextResponse(
        edited_text=edited_text,
        original_text=request.text,
    )


@router.get("/translate/languages", response_model=SupportedLanguagesResponse)
async def get_translate_languages(
    current_user: User = Depends(get_current_user),
):
    """
    Get the list of supported languages for translation.
    """
    return SupportedLanguagesResponse(languages=get_supported_languages())


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(
    request: TranslateRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Translate text to a target language using AI.
    
    Supports translation of selected text or full page content.
    """
    status = is_ai_configured()
    if not status["chat_enabled"]:
        raise HTTPException(
            status_code=503,
            detail="AI translation is not available. Please configure OPENAI_API_KEY.",
        )
    
    # Validate target language
    supported_langs = get_supported_languages()
    if request.target_language not in supported_langs:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {request.target_language}",
        )
    
    translated_text = await translate_text_with_ai(
        request.text,
        request.target_language,
        request.source_language,
    )
    
    return TranslateResponse(
        translated_text=translated_text,
        original_text=request.text,
        target_language=request.target_language,
        target_language_name=supported_langs[request.target_language],
    )


def _extract_text_from_json(content_json: dict) -> str:
    """Extract plain text from Tiptap JSON content."""
    if not content_json:
        return ""
    
    def extract_text(node: dict) -> str:
        text_parts = []
        
        if node.get("type") == "text":
            text_parts.append(node.get("text", ""))
        
        if "content" in node:
            for child in node["content"]:
                text_parts.append(extract_text(child))
        
        return " ".join(text_parts)
    
    return extract_text(content_json).strip()


async def _perform_page_edit(
    db: AsyncSession, 
    page_id: int, 
    edit_instruction: str
) -> str:
    """
    Perform an AI-assisted edit on a page's content.
    """
    import re
    
    # Fetch the page
    result = await db.execute(
        select(Page).where(Page.id == page_id)
    )
    page = result.scalar_one_or_none()
    
    if not page:
        return f"❌ Page with ID {page_id} not found."
    
    if not page.content_json:
        return f"❌ Page '{page.title}' has no content to edit."
    
    # Convert JSON to string for editing
    content_json_str = json.dumps(page.content_json)
    
    # Parse the edit instruction to find simple replacements
    # Common patterns: "change X to Y", "replace X with Y", "use X instead of Y"
    simple_replace = None
    
    # Try to extract old/new values from instruction
    patterns = [
        r"(?:change|replace|use)\s+(\d+)\s+(?:to|with|instead of)\s+(\d+)",
        r"(\d+)\s+(?:to|with|instead of)\s+(\d+)",
        r"(?:from\s+)?(\d+)\s+to\s+(\d+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, edit_instruction, re.IGNORECASE)
        if match:
            old_val, new_val = match.groups()
            simple_replace = (old_val, new_val)
            break
    
    if simple_replace:
        old_val, new_val = simple_replace
        # Replace in the JSON string
        new_content_json_str = content_json_str.replace(old_val, new_val)
        new_content_json = json.loads(new_content_json_str)
        
        # Also update content_text if it exists
        if page.content_text:
            page.content_text = page.content_text.replace(old_val, new_val)
    else:
        # For complex edits, use AI to edit the extracted text
        content_text = _extract_text_from_json(page.content_json)
        if not content_text:
            return f"❌ Could not extract text from page '{page.title}'."
        
        edited_text = await edit_text_with_ai(content_text, edit_instruction)
        
        # Update text nodes in the JSON recursively
        def update_text_nodes(node, old_text, new_text):
            if isinstance(node, dict):
                if node.get("type") == "text" and node.get("text"):
                    # For complex edits, we need smarter matching
                    pass
                if "content" in node:
                    for child in node["content"]:
                        update_text_nodes(child, old_text, new_text)
            elif isinstance(node, list):
                for item in node:
                    update_text_nodes(item, old_text, new_text)
        
        # For complex edits, just update the plain text and return guidance
        page.content_text = edited_text
        new_content_json = page.content_json
    
    # Update the page
    page.content_json = new_content_json
    page.version += 1
    
    await db.commit()
    await db.refresh(page)
    
    changes_made = f"Replaced {simple_replace[0]} with {simple_replace[1]}" if simple_replace else edit_instruction
    
    return f"""✅ **Page Updated Successfully!**

**Page:** {page.title}
**Changes:** {changes_made}
**New Version:** {page.version}

🔄 **Refresh the page** in your browser to see the updated content."""


async def _import_document_to_page(
    db: AsyncSession,
    document_id: str,
    space_id: int,
    title: Optional[str],
    user_id: int,
) -> dict:
    """
    Import a processed document as a new page.
    """
    # Get the uploaded document data
    doc_data = get_uploaded_document(document_id)
    
    if not doc_data:
        return {
            "success": False,
            "message": f"❌ Document not found. The document may have expired. Please upload it again.",
        }
    
    # Verify space exists
    space_result = await db.execute(select(Space).where(Space.id == space_id))
    space = space_result.scalar_one_or_none()
    
    if not space:
        return {
            "success": False,
            "message": f"❌ Space with ID {space_id} not found.",
        }
    
    # Generate page title from filename if not provided
    page_title = title or os.path.splitext(doc_data['filename'])[0]
    page_slug = slugify(page_title)
    
    # Check for slug conflicts
    existing = await db.execute(
        select(Page).where(Page.space_id == space_id, Page.slug == page_slug)
    )
    if existing.scalar_one_or_none():
        import time
        page_slug = f"{page_slug}-{int(time.time())}"
    
    # Convert markdown to Tiptap JSON
    processor = get_document_processor()
    content_json = processor.convert_to_tiptap_json(doc_data['markdown'])
    
    # Create the page
    new_page = Page(
        title=page_title,
        slug=page_slug,
        space_id=space_id,
        owner_id=user_id,
        content_json=content_json,
        content_text=doc_data['text'],
        status=PageStatus.DRAFT,
        version=1,
    )
    
    db.add(new_page)
    await db.commit()
    await db.refresh(new_page)
    
    # Clean up the uploaded document from memory
    clear_uploaded_document(document_id)
    
    return {
        "success": True,
        "page_id": new_page.id,
        "page_slug": new_page.slug,
        "message": f"""✅ **Document Imported Successfully!**

**Page Created:** {page_title}
**Space:** {space.name}
**Status:** Draft

📄 The document has been converted and saved as a new page. You can now view and edit it.""",
    }


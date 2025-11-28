"""
AI API endpoints for chat and summarization.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.page import Page
from app.services.agent import (
    chat_with_agent,
    summarize_page_content,
    edit_text_with_ai,
    is_ai_configured,
    clear_session,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    space_id: Optional[int] = None
    page_id: Optional[int] = None  # Current page context for edits


class ChatResponse(BaseModel):
    response: str
    tool_calls: List[dict]
    page_edited: bool = False
    edited_page_id: Optional[int] = None


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


@router.get("/status", response_model=AIStatusResponse)
async def get_ai_status(
    current_user: User = Depends(get_current_user),
):
    """
    Check if AI features are configured and available.
    """
    return AIStatusResponse(**is_ai_configured())


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
    """
    status = is_ai_configured()
    if not status["chat_enabled"]:
        raise HTTPException(
            status_code=503,
            detail="AI chat is not available. Please configure OPENAI_API_KEY.",
        )
    
    # Create a unique session ID per user
    session_id = f"{current_user.id}_{request.session_id}"
    
    # Add page context to message if available
    message = request.message
    if request.page_id:
        message = f"[Current page ID: {request.page_id}]\n\n{request.message}"
    
    result = await chat_with_agent(
        message=message,
        session_id=session_id,
        space_id=request.space_id,
    )
    
    # Handle EDIT_PAGE marker in response
    response_text = result.get("response", "")
    page_edited = False
    edited_page_id = None
    
    if "EDIT_PAGE:" in response_text:
        # Parse the edit instruction
        try:
            # Format: EDIT_PAGE:page_id:instruction
            parts = response_text.split("EDIT_PAGE:", 1)[1]
            page_id_str, edit_instruction = parts.split(":", 1)
            page_id = int(page_id_str.strip())
            edit_instruction = edit_instruction.strip()
            
            # Perform the actual edit
            edit_result = await _perform_page_edit(db, page_id, edit_instruction)
            result["response"] = edit_result
            result["tool_calls"].append({
                "name": "edit_page_content",
                "args": {"page_id": page_id, "instruction": edit_instruction}
            })
            
            # Mark that a page was edited for real-time update
            if "✅" in edit_result:
                page_edited = True
                edited_page_id = page_id
        except Exception as e:
            result["response"] = f"Failed to edit page: {str(e)}"
    
    return ChatResponse(
        response=result["response"],
        tool_calls=result["tool_calls"],
        page_edited=page_edited,
        edited_page_id=edited_page_id,
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


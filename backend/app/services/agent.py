"""
LangGraph AI Agent with ReAct pattern.
Provides tools for knowledge base search, web search, and page summarization.
"""

from typing import Optional, Dict, Any, List
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from tavily import TavilyClient

from app.core.config import settings
from app.services.embedding import semantic_search


# System prompt for the agent
SYSTEM_PROMPT = """You are SageBase AI, an intelligent assistant for the SageBase knowledge management platform.

Your capabilities:
1. **Knowledge Base Search**: Search for internal documents
2. **Web Search**: Search the web for real-time information
3. **Page Summarization**: Summarize pages
4. **Page Editing**: Edit page content (use when user asks to modify/change/update code in a page)

CRITICAL - Tool Usage Rules:

**ANSWER DIRECTLY (no tools) for:**
- Follow-up questions about content you already discussed
- General coding questions, explanations, or advice
- "How to" questions that don't require searching
- Simple changes like "change X to Y" - just explain how

**Use edit_page_content tool when:**
- User explicitly asks to "edit", "update", "change", or "modify" the page/code
- User says "can you change it to..." referring to the current page
- A page_id is provided in the context (shown as [Current page ID: X])

**Use search_knowledge_base ONLY when:**
- User explicitly asks to "find", "search", or "look up" documents

**Use web_search ONLY when:**
- User needs real-time news or current information

Decision Order:
1. Can I answer from conversation context? → Answer directly
2. Is this a page edit request with page_id? → Use edit_page_content
3. Is this a document search request? → Use search_knowledge_base
4. Need real-time info? → Use web_search

Response Formatting:
- Use markdown formatting
- Use headings and bullet points for clarity
- Use code blocks with language tags
- Keep responses helpful and concise"""


def get_llm() -> Optional[ChatOpenAI]:
    """Get the LLM instance with configurable base URL for vLLM compatibility."""
    if not settings.OPENAI_API_KEY:
        return None
    
    return ChatOpenAI(
        model=settings.OPENAI_MODEL,
        base_url=settings.OPENAI_BASE_URL,
        api_key=settings.OPENAI_API_KEY,
        temperature=0.3,  # Lower temperature for more focused, less tool-eager responses
        streaming=True,
    )


@tool
async def search_knowledge_base(query: str, space_id: Optional[int] = None) -> str:
    """
    Search the SageBase knowledge base for relevant pages.
    
    ONLY use this tool when:
    - User explicitly asks to "find", "search", or "look up" something in the knowledge base
    - You need to discover what documents exist on a topic
    
    DO NOT use this tool for:
    - Follow-up questions about content you already summarized or discussed
    - General coding questions or explanations
    - Questions that can be answered from conversation context
    
    Args:
        query: The search query to find relevant pages
        space_id: Optional space ID to limit search to a specific space
    
    Returns:
        A formatted string with search results including page titles and content previews
    """
    if not settings.OPENAI_API_KEY:
        return "Knowledge base search is not available (API key not configured)."
    
    try:
        results = await semantic_search(query, space_id=space_id, limit=5)
        
        if not results:
            return f"No results found in the knowledge base for: '{query}'"
        
        formatted_results = []
        for i, result in enumerate(results, 1):
            formatted_results.append(
                f"**{i}. {result['title']}** (relevance: {result['score']:.2f})\n"
                f"   {result['content_preview'][:200]}..."
            )
        
        return f"Found {len(results)} relevant pages:\n\n" + "\n\n".join(formatted_results)
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"


@tool
def web_search(query: str) -> str:
    """
    Search the web for current/real-time information using Tavily.
    
    ONLY use this tool when:
    - User asks about current news, events, or real-time data
    - User explicitly asks to "search the web" or "look online"
    - You need very recent information (last few days/weeks)
    
    DO NOT use this tool for:
    - General programming questions (you already know this)
    - Follow-up questions about discussed content
    - Anything that can be answered from your training knowledge
    
    Args:
        query: The search query
    
    Returns:
        Search results from the web with titles, URLs, and content snippets
    """
    if not settings.TAVILY_API_KEY:
        return "Web search is not available (Tavily API key not configured)."
    
    try:
        client = TavilyClient(api_key=settings.TAVILY_API_KEY)
        response = client.search(query, max_results=5, include_answer=True)
        
        results = []
        
        # Include the AI-generated answer if available
        if response.get("answer"):
            results.append(f"**Quick Answer:** {response['answer']}\n")
        
        # Include search results
        for i, result in enumerate(response.get("results", []), 1):
            results.append(
                f"**{i}. [{result['title']}]({result['url']})**\n"
                f"   {result['content'][:200]}..."
            )
        
        return "\n\n".join(results) if results else f"No web results found for: '{query}'"
    except Exception as e:
        return f"Error performing web search: {str(e)}"


@tool
async def summarize_page(page_id: int) -> str:
    """
    Get and summarize a specific page from the knowledge base by its ID.
    Use this when you need detailed information about a specific page.
    
    Args:
        page_id: The ID of the page to summarize
    
    Returns:
        A summary of the page content
    """
    # This will be implemented to fetch page content from the database
    # For now, return a placeholder that the API will handle
    return f"SUMMARIZE_PAGE:{page_id}"


@tool
async def edit_page_content(page_id: int, edit_instruction: str) -> str:
    """
    Edit a page's content based on an instruction.
    
    Use this tool when the user asks to:
    - Edit, modify, or update the code/content in a page
    - Change values, fix bugs, or make improvements to page content
    - The user must be viewing or have just discussed the page
    
    Args:
        page_id: The ID of the page to edit
        edit_instruction: Clear description of what changes to make (e.g., "change 1000 to 2000")
    
    Returns:
        Confirmation of the edit or error message
    """
    # Return a marker that the API layer will handle
    return f"EDIT_PAGE:{page_id}:{edit_instruction}"


# Store for agent instances per session
_agent_cache: Dict[str, Any] = {}
_memory_store = MemorySaver()


def get_agent(session_id: str = "default"):
    """Get or create a ReAct agent for the given session."""
    global _agent_cache
    
    llm = get_llm()
    if not llm:
        return None
    
    # Create agent if not cached
    if session_id not in _agent_cache:
        tools = [search_knowledge_base, web_search, summarize_page, edit_page_content]
        
        agent = create_react_agent(
            model=llm,
            tools=tools,
            checkpointer=_memory_store,
            prompt=SYSTEM_PROMPT,  # Use 'prompt' instead of deprecated 'state_modifier'
        )
        _agent_cache[session_id] = agent
    
    return _agent_cache[session_id]


async def chat_with_agent(
    message: str,
    session_id: str = "default",
    space_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Send a message to the AI agent and get a response.
    
    Args:
        message: The user's message
        session_id: Session ID for conversation memory
        space_id: Optional space context for knowledge base searches
    
    Returns:
        Dict with 'response' text and 'tool_calls' list
    """
    agent = get_agent(session_id)
    if not agent:
        return {
            "response": "AI features are not available. Please configure OPENAI_API_KEY.",
            "tool_calls": [],
        }
    
    try:
        # Prepare the input
        config = {"configurable": {"thread_id": session_id}}
        
        # If space_id is provided, add context to the message
        if space_id:
            message = f"[Context: searching in space ID {space_id}]\n\n{message}"
        
        # Run the agent
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=message)]},
            config=config,
        )
        
        # Extract the response and tool calls
        messages = result.get("messages", [])
        tool_calls = []
        response_text = ""
        
        for msg in messages:
            if isinstance(msg, AIMessage):
                if msg.content:
                    response_text = msg.content
                if hasattr(msg, "tool_calls") and msg.tool_calls:
                    for tc in msg.tool_calls:
                        tool_calls.append({
                            "name": tc.get("name", "unknown"),
                            "args": tc.get("args", {}),
                        })
        
        return {
            "response": response_text or "I apologize, but I couldn't generate a response.",
            "tool_calls": tool_calls,
        }
    except Exception as e:
        return {
            "response": f"An error occurred: {str(e)}",
            "tool_calls": [],
        }


async def summarize_page_content(page_title: str, page_content: str) -> str:
    """
    Summarize page content using the LLM.
    
    Args:
        page_title: The title of the page
        page_content: The text content of the page
    
    Returns:
        A summary of the page
    """
    llm = get_llm()
    if not llm:
        return "AI features are not available. Please configure OPENAI_API_KEY."
    
    try:
        messages = [
            SystemMessage(content="""You are a helpful assistant that creates well-formatted summaries using markdown.

Formatting rules:
- Use ## for main section headings
- Use bullet points for lists
- Add blank lines between sections
- Use **bold** for key terms
- Keep paragraphs short and scannable"""),
            HumanMessage(content=f"""Summarize this page in a well-structured format:

**Title:** {page_title}

**Content:**
{page_content[:8000]}

Structure your response as:

## Overview
Brief 1-2 sentence overview of what this page is about.

## Key Points
- Point 1
- Point 2
- Point 3

## Details
Any important details or takeaways worth noting.

Keep the summary concise but informative."""),
        ]
        
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        return f"Error summarizing page: {str(e)}"


def clear_session(session_id: str):
    """Clear the agent cache for a session."""
    global _agent_cache
    if session_id in _agent_cache:
        del _agent_cache[session_id]


async def edit_text_with_ai(text: str, instruction: str) -> str:
    """
    Edit text based on an instruction using the LLM.
    
    Args:
        text: The original text to edit
        instruction: The instruction describing how to edit the text
    
    Returns:
        The edited text
    """
    llm = get_llm()
    if not llm:
        return text  # Return original if AI not available
    
    try:
        messages = [
            SystemMessage(content="""You are a helpful writing assistant. 
Your task is to edit the given text according to the user's instruction.
Only return the edited text, nothing else. Do not include explanations or quotes around the text.
Preserve the original formatting style (markdown, etc.) unless instructed otherwise."""),
            HumanMessage(content=f"""Original text:
{text}

Instruction: {instruction}

Please provide the edited text:"""),
        ]
        
        response = await llm.ainvoke(messages)
        edited = response.content.strip()
        
        # Clean up any accidental quotes or prefixes
        if edited.startswith('"') and edited.endswith('"'):
            edited = edited[1:-1]
        if edited.startswith("'") and edited.endswith("'"):
            edited = edited[1:-1]
        
        return edited
    except Exception as e:
        return text  # Return original on error


def is_ai_configured() -> Dict[str, bool]:
    """Check which AI features are configured."""
    return {
        "chat_enabled": bool(settings.OPENAI_API_KEY),
        "web_search_enabled": bool(settings.TAVILY_API_KEY),
        "knowledge_search_enabled": bool(settings.OPENAI_API_KEY),
    }


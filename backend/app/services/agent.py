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
4. **Content Drafting**: Generate beautifully formatted content for insertion
5. **Page Editing**: Edit page content (use when user asks to modify/change/update code in a page)
6. **Page Creation**: Create new beautifully formatted pages with proper structure
7. **Document Import**: Convert uploaded documents (PDF, DOCX, etc.) into pages

CRITICAL - Tool Usage Rules:

**Use draft_content tool (PRIMARY TOOL - MANDATORY for all substantial content) when:**
- User asks ANY question that needs more than 2 sentences to answer
- User asks to "write a report", "write a blog", "create documentation"
- User asks to "create a comprehensive report", "document this topic", "explain in detail"
- User needs content with code examples, tables, lists, or structured information
- User asks "write about...", "draft...", "generate content for..."
- User asks questions about a topic (e.g., "tell me about X", "what is Y", "explain Z")
- **CRITICAL: You MUST call draft_content tool and pass the full markdown content to it**
- **DO NOT just say "I have prepared a draft" - you MUST actually call the draft_content tool**
- The content will be shown in a beautiful card with an "Insert" button
- **If you don't call draft_content, the user won't see your formatted content!**

**ANSWER DIRECTLY (no tools) ONLY for:**
- Very simple yes/no questions
- Quick clarifications that need 1-2 sentences
- Follow-up questions about your previous responses in the conversation

**Use create_page tool when:**
- User explicitly asks to "create a page", "make a new page"
- User says "create a page in [space] about [topic]"
- A space_id is provided in the context

**Use edit_page_content tool when:**
- User explicitly asks to "fix", "correct", "change X to Y" in existing content
- User says "edit the page to..."

**Use import_document_to_page tool when:**
- User uploads a document AND asks to "import", "create page from this"

**Use search_knowledge_base ONLY when:**
- User explicitly asks to "find", "search", "look up" documents in the knowledge base

**Use web_search ONLY when:**
- User needs real-time news or current information from the internet

FORMATTING REQUIREMENTS for draft_content:

When using draft_content, ALWAYS follow these markdown formatting rules:

1. **Headings**: Use ## for main sections, ### for subsections
   Example: ## Overview, ### Key Points

2. **Lists**:
   - Bullet lists: Use `- item` for features, benefits
   - Numbered lists: Use `1. step` for procedures, steps
   - Nested lists: Use 2-space indentation for sub-items
     Example:
     - Main point
       - Sub-point 1
       - Sub-point 2

3. **Code Blocks**: Use triple backticks with language tag
   Example: ```python\\ncode here\\n```

4. **Blockquotes**: Use `> text` for important notes, warnings, callouts
   Example: > **Note:** This is important information

5. **Tables**: Use proper markdown table syntax (will render as interactive tables)
   Example:
   | Column 1 | Column 2 |
   |----------|----------|
   | Data 1   | Data 2   |

6. **Horizontal Rules**: Use `---` to separate major sections

7. **Inline Formatting** (can be combined):
   - **Bold**: Use **text** for emphasis and key terms
   - *Italic*: Use *text* for subtle emphasis
   - `Inline code`: Use `code` for commands, variables, file names
   - [Links](url): Use [text](url) for clickable links
   - Plain URLs: http://example.com automatically becomes clickable
   - ~~Strikethrough~~: Use ~~text~~ for deprecated/outdated info
   - ==Highlight==: Use ==text== to call attention to important text

8. **Structure**: Always include:
   - Clear introduction/overview section
   - Organized sections with headings
   - Concise paragraphs (3-4 lines max)
   - Proper spacing between sections
   - Use tables for comparisons or structured data
   - Use nested lists for hierarchical information

Example of well-formatted draft_content:

```markdown
## Overview
Brief introduction to the topic with key context. Check out https://example.com for more info.

## Main Section

### Subsection 1
Content explaining the first point with **bold emphasis** and `inline code`.

- Feature 1: Description
  - Sub-feature A: Details
  - Sub-feature B: More details
- Feature 2: Description
- ==Important Feature==: This one is highlighted

### Subsection 2
More detailed information with a comparison table.

| Feature | Before | After |
|---------|--------|-------|
| Speed | Slow | Fast |
| Cost | High | Low |

> **Important:** Critical note or warning for the user.

### Code Example
Here's how to implement this:

```python
def example_function():
    return "Hello, World!"
```

## Deprecated Features
~~Old API~~ has been replaced with the new API. See [documentation](https://docs.example.com) for migration guide.

## Summary
Final thoughts and takeaways with *subtle emphasis*.
```

**CRITICAL REMINDERS:**
1. **ALWAYS call draft_content tool** - Don't just describe what you would write, actually call the tool with the content!
2. **Pass the full markdown to draft_content** - The content parameter must contain your complete formatted response
3. **Never say "I have prepared..." without calling the tool** - The user can only see content if you use draft_content
4. Users prefer formatted, insertable content over plain chat responses - so USE THE TOOL!"""


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


@tool
async def import_document_to_page(document_id: str, space_id: int, title: Optional[str] = None) -> str:
    """
    Import an uploaded document as a new page in a space.
    
    Use this tool when:
    - User uploads a document (PDF, DOCX, etc.) and wants to create a page from it
    - User says "import this document", "create a page from this file", "convert to page"
    
    Args:
        document_id: The ID of the uploaded document (from the attachment)
        space_id: The space ID where the page should be created
        title: Optional title for the page (defaults to document filename)
    
    Returns:
        Confirmation with page details or error message
    """
    # Return a marker that the API layer will handle
    return f"IMPORT_DOC:{document_id}:{space_id}:{title or ''}"


@tool
async def create_page(space_id: int, title: str, topic: str, content_outline: Optional[str] = None) -> str:
    """
    Create a new beautifully formatted page in a space.
    
    Use this tool when:
    - User asks to "create a page", "make a page", "write a page about..."
    - User wants to generate documentation, guides, tutorials, or structured content
    - User says "create a new page in [space] about [topic]"
    
    The page will be created with proper formatting including:
    - Headings and subheadings
    - Bullet and numbered lists
    - Code blocks (if relevant)
    - Tables (if appropriate)
    - Blockquotes for important notes
    
    Args:
        space_id: The space ID where the page should be created
        title: The title for the new page
        topic: Description of what the page should be about
        content_outline: Optional outline or specific sections to include
    
    Returns:
        Confirmation with page details or error message
    """
    # Return a marker that the API layer will handle
    outline_part = content_outline.replace(':', '::') if content_outline else ''
    return f"CREATE_PAGE:{space_id}:{title}:{topic}:{outline_part}"


@tool
async def draft_content(content: str) -> str:
    """
    Generate a draft of content for the user to review and insert.

    Use this tool when:
    - User asks to "write a report", "draft a section", "generate content"
    - User asks questions that need comprehensive answers with code examples
    - You want to provide formatted content that can be inserted into the page
    - User needs a well-structured response with headings, lists, code blocks, etc.

    The content will be shown to the user with an "Insert" button in a formatted card.

    CRITICAL FORMATTING RULES:
    - Use proper markdown with headings (## H2, ### H3)
    - Use bullet lists (- item) and nested lists (2-space indent: - item\\n  - subitem)
    - Use numbered lists (1. item) for steps, procedures
    - Use code blocks (```language\\ncode\\n```) with language tags
    - Use blockquotes (> text) for important notes, warnings
    - Use tables (| col |) for structured data - they render as interactive tables!
    - Use horizontal rules (---) to separate sections
    - Use **bold** for emphasis, *italic* for subtle emphasis
    - Use `code` for inline code, variables, commands
    - Use [text](url) for links, or plain URLs (auto-linked)
    - Use ~~strikethrough~~ for deprecated/outdated information
    - Use ==highlight== to call attention to important text
    - Keep content well-structured and comprehensive

    Args:
        content: The full markdown content with proper formatting.

    Returns:
        Confirmation that draft was created.
    """
    return "DRAFT_GENERATED"

# Store for uploaded documents in memory (temporary storage for chat session)
_uploaded_documents: Dict[str, Dict[str, Any]] = {}


def store_uploaded_document(doc_id: str, data: Dict[str, Any]) -> None:
    """Store an uploaded document's processed data."""
    _uploaded_documents[doc_id] = data


def get_uploaded_document(doc_id: str) -> Optional[Dict[str, Any]]:
    """Retrieve an uploaded document's data."""
    return _uploaded_documents.get(doc_id)


def clear_uploaded_document(doc_id: str) -> None:
    """Clear an uploaded document from memory."""
    _uploaded_documents.pop(doc_id, None)


# Store for agent instances per session
_agent_cache: Dict[str, Any] = {}
_memory_store = MemorySaver()


def _prepare_agent_messages(state):
    """
    Prepare messages for the agent by injecting the system prompt.
    This function is called before each LLM invocation.
    """
    from langchain_core.messages import SystemMessage

    # Create the system message with our prompt
    system_message = SystemMessage(content=SYSTEM_PROMPT)

    # Return system message + conversation messages
    return [system_message] + state["messages"]


def get_agent(session_id: str = "default"):
    """Get or create a ReAct agent for the given session."""
    global _agent_cache

    llm = get_llm()
    if not llm:
        return None

    # Create agent if not cached
    if session_id not in _agent_cache:
        tools = [search_knowledge_base, web_search, summarize_page, edit_page_content, import_document_to_page, create_page, draft_content]

        # Create agent with prompt function
        agent = create_react_agent(
            model=llm,
            tools=tools,
            prompt=_prepare_agent_messages,
            checkpointer=_memory_store,
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
If the Original Text is empty or marked as (Empty page), treat the instruction as a request to generate new content.
Only return the result text, nothing else. Do not include explanations or quotes around the text.
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


# Supported languages for translation
SUPPORTED_LANGUAGES = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "it": "Italian",
    "pt": "Portuguese",
    "ru": "Russian",
    "zh": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "bn": "Bengali",
    "nl": "Dutch",
    "pl": "Polish",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "id": "Indonesian",
    "ms": "Malay",
    "sv": "Swedish",
    "da": "Danish",
    "no": "Norwegian",
    "fi": "Finnish",
    "el": "Greek",
    "he": "Hebrew",
    "uk": "Ukrainian",
    "cs": "Czech",
    "ro": "Romanian",
    "hu": "Hungarian",
}


def get_supported_languages() -> Dict[str, str]:
    """Return the dictionary of supported language codes and names."""
    return SUPPORTED_LANGUAGES


async def translate_text_with_ai(text: str, target_language: str, source_language: str = "auto") -> str:
    """
    Translate text to the target language using the LLM.
    
    Args:
        text: The text to translate
        target_language: The target language code (e.g., 'es', 'fr', 'de')
        source_language: The source language code or 'auto' for auto-detection
    
    Returns:
        The translated text
    """
    llm = get_llm()
    if not llm:
        return text  # Return original if AI not available
    
    target_lang_name = SUPPORTED_LANGUAGES.get(target_language, target_language)
    
    source_context = ""
    if source_language != "auto" and source_language in SUPPORTED_LANGUAGES:
        source_lang_name = SUPPORTED_LANGUAGES[source_language]
        source_context = f"The source text is in {source_lang_name}. "
    
    try:
        messages = [
            SystemMessage(content=f"""You are an expert translator. 
{source_context}Translate the given text accurately to {target_lang_name}.

Rules:
- Preserve the original meaning, tone, and style
- Keep any formatting (markdown, code blocks, etc.) intact
- Do not add explanations or notes - only return the translated text
- Maintain paragraph breaks and list structures
- For technical terms that are commonly left in English (like programming terms), keep them in English if appropriate for the target language
- If the text contains code, translate only comments and strings, not the code itself"""),
            HumanMessage(content=f"""Translate the following text to {target_lang_name}:

{text}"""),
        ]
        
        response = await llm.ainvoke(messages)
        translated = response.content.strip()
        
        return translated
    except Exception as e:
        return f"Translation error: {str(e)}"


async def generate_created_page_content(title: str, topic: str, outline: Optional[str] = None) -> str:
    """
    Generate comprehensive page content using AI based on title and topic.
    
    Args:
        title: Page title
        topic: Page topic/description
        outline: Optional content outline
        
    Returns:
        Markdown formatted content
    """
    llm = get_llm()
    if not llm:
        return f"# {title}\n\nAI generation unavailable. Please configure API keys."
    
    outline_text = f"\n\nSuggested Outline:\n{outline}" if outline else ""
    
    try:
        messages = [
            SystemMessage(content="""You are an expert technical writer and documentarian.
Your task is to create a comprehensive, well-structured, and beautiful document based on the user's request.

Formatting Rules for Beautiful Pages:
1. **Structure**:
   - Start with a clear H1 title (but don't duplicate the page title if implied)
   - Use H2 for main sections and H3 for subsections
   - Include an introduction/overview section
   
2. **Visual elements**:
   - Use bullet lists for features, benefits, or lists
   - Use numbered lists for steps, procedures, or tutorials
   - Use blockquotes (> quote) for callouts, important notes, or warnings
   - Use code blocks (```language) for all code snippets, commands, or configuration
   - Use tables for comparing data or structured information
   - Use horizontal rules (---) to separate major sections

3. **Content Style**:
   - clear, professional, and engaging tone
   - use **bold** for key concepts and _italics_ for emphasis
   - keep paragraphs concise (3-4 lines max)
   - ensure the content is detailed and substantive (not just a skeleton)

4. **Specific Elements**:
   - If writing a guide, include prerequisites and a conclusion
   - If documenting code, include examples and explanations
   - If creating a dashboard note, keep it scannable

Return ONLY the markdown content."""),
            HumanMessage(content=f"""Create a detailed page content for:
Title: {title}
Topic/Description: {topic}{outline_text}

Generate the full content in Markdown format."""),
        ]
        
        response = await llm.ainvoke(messages)
        return response.content
    except Exception as e:
        return f"# {title}\n\nError generating content: {str(e)}\n\n## Topic\n{topic}"


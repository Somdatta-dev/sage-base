# Smart Search & AI Knowledge System

## What This Document Covers

This guide explains how SageBase helps you find information across your workspace using smart search technology. Think of it as having a super-smart librarian that understands what you're looking for, even when you don't use the exact words.

**What You'll Learn:**
- How the system remembers and organizes your pages
- When and how pages become searchable
- Different ways to search for information
- How the AI assistant uses this information
- Tips for getting the best search results

---

## The Big Picture

Imagine you have thousands of documents in your workspace. Finding the right information manually would be like searching for a needle in a haystack. SageBase solves this problem with two powerful search methods:

### Two Ways to Search

**1. Keyword Search (Like Google)**
- Fast and straightforward
- Looks for exact word matches
- Great when you know specific terms
- Example: Searching "password reset" finds pages with those exact words

**2. Smart Search (AI-Powered)**
- Understands the meaning behind your question
- Finds relevant content even with different words
- Like having a conversation with a knowledgeable assistant
- Example: Asking "How do I get back into my account?" finds password reset guides

**Why This Matters:**
- You can ask questions naturally, not just type keywords
- Finds related information you might have missed
- Saves time by understanding context

---

## How Your Pages Get Organized

### What Happens Behind the Scenes

Think of it like organizing a massive library:

**Step 1: Writing a Book Summary**
- When you publish a page, the system reads all the content
- It creates a "summary fingerprint" of what the page is about
- This fingerprint helps find similar pages later

**Step 2: Filing in Two Places**

Your pages are stored in two smart filing systems:

**The Main Filing Cabinet (Regular Storage)**
- Stores the complete page with all text and formatting
- Like keeping the original document in a file folder
- Fast to look up when you know exactly what you want

**The Smart Index (AI-Powered Search)**
- Converts your page into a "meaning map"
- Groups similar topics together automatically
- Helps find pages based on concepts, not just words

**Example:**
If you write a page about "Resetting User Passwords," the system:
- Saves the full page in the main storage
- Creates a "meaning map" that connects it to related topics like:
  - Account recovery
  - Login problems
  - Security procedures
  - User management

---

## When Pages Become Searchable

Pages don't appear in search results until specific things happen:

### The Four Key Moments

**1. Publishing a Page** ⭐ *Most Common*

When you click "Publish" on a draft:
- The page becomes visible to others
- It gets added to the searchable index
- Takes just a few seconds to process
- Like officially adding a book to the library catalog

**2. Approving Changes**

When someone suggests edits and you approve them:
- The updated version gets re-indexed
- Old information is replaced with new
- Ensures search results stay current

**3. AI Adds Content**

When the AI assistant adds information to a page:
- The page automatically updates in the search index
- New content becomes searchable immediately
- Keeps everything synchronized

**4. Manual Re-indexing**

Sometimes you need to refresh everything:
- Useful after major updates or system changes
- Rebuilds the entire search index from scratch
- Like reorganizing your entire library

### Important Notes

**What Gets Indexed:**
- ✅ Published pages (visible to everyone)
- ❌ Draft pages (still being worked on)
- ❌ Archived pages (old/inactive content)

**When It Happens:**
- Indexing runs in the background
- Doesn't slow down your work
- If something goes wrong, your page still saves successfully

---

## How the Search Works

### Method 1: Keyword Search (The Quick Way)

**What It Does:**
Searches for pages containing your exact words, like using Ctrl+F on steroids.

**How It Works:**
1. You type words like "API documentation"
2. The system looks through all published pages
3. Finds pages with those exact words in the title or content
4. Shows results sorted by most recently updated

**Best For:**
- Finding specific technical terms
- Searching for names or codes
- Quick lookups when you know what you're looking for

**Example:**
- Search: "authentication token"
- Finds: Pages with those exact words
- Speed: Lightning fast (milliseconds)

---

### Method 2: Smart Search (The AI Way)

**What It Does:**
Understands the meaning of your question and finds relevant information, even if the exact words don't match.

**How It Works:**
1. You ask a natural question: "How do I secure user logins?"
2. The AI converts your question into a "meaning map"
3. Compares it to the "meaning maps" of all your pages
4. Finds pages about authentication, security, and login procedures
5. Shows results ranked by how relevant they are

**The Magic Behind It:**
- Uses the same technology as ChatGPT
- Understands synonyms (e.g., "car" = "vehicle" = "automobile")
- Grasps context (knows "bank" in finance vs. river bank)
- Learns from patterns in millions of documents

**Best For:**
- Asking questions in plain English
- Finding related topics you didn't think of
- Exploring unfamiliar areas
- Research and learning

**Example Searches:**

| You Ask | It Finds |
|---------|----------|
| "How to fix login problems?" | Password reset guides, troubleshooting docs, authentication setup |
| "Making the app faster" | Performance optimization, caching strategies, database tuning |
| "Keeping data safe" | Security best practices, encryption guides, access control |

**Relevance Scores:**
- Each result gets a score from 0% to 100%
- Higher scores = more relevant to your question
- 80%+ = Highly relevant
- 60-80% = Moderately relevant
- Below 60% = Weakly related

---

## Comparing the Two Search Methods

| Feature | Keyword Search | Smart Search |
|---------|---------------|--------------|
| **Speed** | Super fast | A bit slower (but still quick) |
| **How you search** | Type keywords | Ask natural questions |
| **Understands synonyms** | No | Yes |
| **Understands context** | No | Yes |
| **Best for** | Finding known terms | Exploring and learning |
| **Results sorted by** | Most recent | Most relevant |

**Pro Tip:** Start with keyword search if you know specific terms. Use smart search when exploring or learning about a topic.

---

## How the AI Assistant Uses This System

Your AI assistant is like a smart research partner that knows your entire workspace.

### What the AI Can Do

**1. Answer Questions Using Your Pages**

When you ask the AI a question:
- It searches your workspace for relevant information
- Reads the most relevant pages
- Combines information from multiple sources
- Gives you a comprehensive answer with references

**Example Conversation:**

**You:** "What are our authentication best practices?"

**AI thinks:** *Let me search for authentication documentation...*
- Finds: "Security Guidelines" (89% relevant)
- Finds: "Login Implementation" (76% relevant)
- Finds: "Password Policies" (71% relevant)

**AI responds:** "Based on your Security Guidelines page, here are the authentication best practices:
1. Use strong password hashing
2. Enable two-factor authentication
3. Implement session timeout..."

**2. Create Well-Formatted Content**

The AI can draft new content for you:
- Writes in proper format with headings, lists, and examples
- Uses information from your existing pages
- Presents it in a nice card with an "Insert" button
- You review and add it to your page with one click

**3. Find Related Information**

Even if you don't ask, the AI:
- Connects related concepts
- Suggests relevant pages
- Helps you discover information you didn't know existed

---

## Understanding the Storage System

### Where Your Information Lives

**Think of it like a well-organized office:**

**The Filing Cabinet (Main Database)**
- Stores complete pages with all details
- Organized by title, date, and workspace
- Like keeping physical documents in folders
- Fast to access specific pages

**The Smart Card Catalog (Vector Search)**
- Stores "meaning fingerprints" of pages
- Groups similar topics together
- Like a librarian who knows where everything is
- Helps find related information quickly

**The Archive Room (Backup Storage)**
- Keeps history of all changes
- Allows you to restore old versions
- Like having photocopies of previous editions

### Why Both Systems?

Using both together gives you:
- **Speed:** Quick keyword lookups
- **Smarts:** Intelligent topic matching
- **Safety:** Everything is backed up
- **Flexibility:** Choose the best search method for your need

---

## Supported Document Types

You can upload various file types, and SageBase will automatically extract and index the content:

| File Type | What We Extract |
|-----------|-----------------|
| **PDF** | Text content (perfect for reports and articles) |
| **Word (.docx)** | Text, headings, lists, tables (keeps structure) |
| **PowerPoint (.pptx)** | Slide text and notes |
| **Excel (.xlsx)** | Data from spreadsheets (converted to tables) |
| **Markdown (.md)** | All formatting preserved |
| **HTML** | Web page content and structure |
| **Text (.txt)** | Plain text |

**What Happens When You Upload:**
1. File is processed and converted to readable format
2. Text is extracted while preserving structure
3. Content becomes searchable within seconds
4. Original formatting is maintained when possible

---

## Getting Started

### Setting Up the System

**What You Need:**
1. **OpenAI API Key:** Powers the smart search (like a brain subscription)
2. **Basic Server:** Runs the database and search engine
3. **5 Minutes:** For initial setup

**Setup Steps (Simplified):**

**Step 1: Install the Foundation**
- The system needs two main components:
  - A database (stores your pages)
  - A search engine (makes pages findable)
- Both run in the background, you won't see them

**Step 2: Add Your API Key**
- Get a key from OpenAI (think of it as a smart search license)
- Add it to your configuration file
- This enables the AI-powered features

**Step 3: Start the System**
- Run a simple command
- The system initializes everything automatically
- Takes about 30 seconds

**Step 4: You're Done!**
- Start publishing pages
- They automatically become searchable
- Begin using smart search and AI features

---

## Tips for Best Results

### Writing Searchable Pages

**Make Your Pages Easy to Find:**

**1. Use Clear Titles**
- ✅ "How to Reset User Passwords"
- ❌ "Page 17"

**2. Add Descriptive Content**
- Include the main topic in the first paragraph
- Use relevant keywords naturally
- Explain concepts clearly

**3. Structure Information Well**
- Use headings and subheadings
- Break content into sections
- Add lists and examples

**4. Update Regularly**
- Keep information current
- Archive outdated pages
- Refresh important content

### Searching Effectively

**For Keyword Search:**
- Use specific, unique terms
- Try different variations if needed
- Use quotes for exact phrases

**For Smart Search:**
- Ask complete questions
- Be specific about what you need
- Use natural language
- Don't worry about exact wording

**Examples:**

**Good Questions:**
- "What are the steps to deploy the application?"
- "How do I troubleshoot database connection errors?"
- "What security measures should I implement?"

**Could Be Better:**
- "deploy" (too vague)
- "database thing" (unclear)
- "security" (too broad)

---

## Performance & Speed

### What to Expect

**Search Speed:**
- Keyword search: Instant (< 0.01 seconds)
- Smart search: Quick (0.05-0.2 seconds)
- AI responses: Fast (2-5 seconds for complex questions)

**Indexing Speed:**
- New page: Ready to search in 2-5 seconds
- Updated page: Re-indexed in 2-5 seconds
- Large document: May take 10-15 seconds

### How Much Can It Handle?

**System Capacity:**

| Number of Pages | Performance | Notes |
|----------------|-------------|-------|
| Under 1,000 | Blazing fast | Perfect for small teams |
| 1,000-10,000 | Very fast | Great for most organizations |
| 10,000-100,000 | Fast | Suitable for large companies |
| 100,000+ | Still good | May need server upgrades |

**What This Means:**
- Even with thousands of pages, search stays quick
- The system scales with your needs
- No need to worry about performance initially

---

## Common Questions & Solutions

### "My page isn't showing up in search"

**Quick Checks:**
1. Is the page published? (Drafts don't appear in search)
2. Did you just publish it? (Wait 10-15 seconds)
3. Try the other search method (keyword vs. smart search)

**If Still Not Working:**
- Check if the page has enough content (very short pages may not index well)
- Try searching for a unique word from the page
- Contact support if the issue persists

---

### "Search results aren't relevant"

**Try These:**
1. **Rephrase your question** - Use different words
2. **Be more specific** - Add details to narrow results
3. **Use keyword search** - If you know exact terms
4. **Check spelling** - Typos can affect results

**Example Improvements:**

| Less Effective | More Effective |
|----------------|----------------|
| "auth" | "user authentication setup guide" |
| "slow" | "how to improve application performance" |
| "error" | "database connection timeout error" |

---

### "Search is slow"

**This is rare, but if it happens:**
- First search of the day may take a moment (system warming up)
- Very complex questions might take a few seconds
- Check your internet connection (AI features need connectivity)

**Normal Speed:**
- Keyword search: Instant
- Smart search: Under 1 second
- AI answers: 2-5 seconds

---

## Privacy & Security

### Your Data is Safe

**What's Protected:**
- Page content is private to your workspace
- Only team members can search your pages
- AI searches don't share your data with others
- All connections are encrypted

**How Search Respects Privacy:**
- Private workspace pages stay private
- Search results filter by permissions automatically
- You only see pages you have access to
- Admins can control who sees what

---

## Summary

### What You've Learned

**The System Has:**
- Two search methods (keyword and smart)
- Automatic indexing when you publish
- AI assistant that reads your workspace
- Support for many file types
- Fast performance even with thousands of pages

**You Can:**
- Find information using natural questions
- Get AI-powered answers from your content
- Upload various document types
- Trust that everything is secure and private

**Best Practices:**
- Write clear, descriptive titles
- Publish pages to make them searchable
- Use smart search for exploration
- Use keyword search for specific terms
- Keep important pages updated

---

## Need Help?

### Quick Reference

**For Finding Information:**
- Use keyword search for known terms
- Use smart search for questions and exploration
- Ask the AI assistant for comprehensive answers

**For Making Content Searchable:**
- Publish your pages
- Use clear titles and headings
- Include relevant keywords naturally
- Keep content updated

**Common Files Locations:**
- Main search settings: `backend/app/core/config.py`
- Search features: `backend/app/api/search.py`
- AI assistant: `backend/app/services/agent.py`

**Getting Support:**
- Check this documentation first
- Try both search methods
- Review the tips section
- Contact your system administrator

---

## What Makes This Special

Traditional search is like asking "Does this exact word exist in my documents?"

SageBase's smart search is like asking a knowledgeable colleague who:
- Understands what you mean, not just what you say
- Knows where all the information is
- Can explain things from multiple sources
- Helps you discover related topics

This makes finding information feel natural and effortless, letting you focus on your work instead of searching for the right document.

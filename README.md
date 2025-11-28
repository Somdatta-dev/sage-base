# SageBase - Internal Knowledge Base

A Confluence-like internal knowledge base with Notion-style markdown editing and AI-powered features. Built with Next.js 16, React 19, FastAPI, PostgreSQL, and Qdrant vector database.

**Repository**: [https://github.com/Somdatta-dev/sage-base](https://github.com/Somdatta-dev/sage-base)

## Features

### Core Features
- **JWT Authentication**: Secure token-based authentication with admin-only user creation
- **Notion-style Editor**: Rich block-based editing with TipTap
- **Spaces**: Organize documentation by team or project
- **Hierarchical Pages**: Nested page structure with drag-and-drop reordering
- **Full-text Search**: PostgreSQL-powered search across all content
- **Version History**: Track and restore previous page versions
- **Role-based Access**: Admin, Member, and Viewer roles
- **Docker Ready**: One-command deployment with Docker Compose

### AI Features
- **AI Sidebar Chat**: Collapsible chat sidebar with floating bubble icon for AI conversations
- **AI Selection Popup**: Inline text editing - select text and get AI-powered suggestions
- **Semantic Search**: Vector search using OpenAI embeddings and Qdrant
- **AI Text Editing**: Right-click context menu with "Edit with AI" option
- **Smart Responses**: AI understands context from the current page

### Editor Features
- **Slash Commands**: Type `/` to access formatting options:
  - `/heading1`, `/heading2`, `/heading3` - Headers
  - `/bullet` - Bullet list
  - `/numbered` - Numbered list
  - `/quote` - Block quote
  - `/code` - Code block
  - `/divider` - Horizontal divider
  - `/image` - Insert image
- **Rich Text Formatting**: Bold, italic, underline, strikethrough, code
- **Markdown Support**: Paste markdown content with automatic formatting
- **Context Menu**: Right-click for cut, copy, paste, and AI edit options
- **Image Upload**: Drag-and-drop or click to upload images

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js 16    │────▶│    FastAPI      │────▶│   PostgreSQL    │
│   Port: 3737    │     │   Port: 8787    │     │   Port: 5437    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │     Qdrant      │
                        │   Port: 6337    │
                        └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 24+ (for local development)
- Python 3.12+ (for local development)

### Production Deployment

1. **Clone and configure**:
   ```bash
   git clone https://github.com/Somdatta-dev/sage-base.git
   cd sage-base
   cp env.example .env
   # Edit .env with your settings (especially SECRET_KEY!)
   ```

2. **Start all services**:
   ```bash
   docker-compose up -d
   ```

3. **Run database migrations**:
   ```bash
   docker-compose exec backend alembic upgrade head
   ```

4. **Access the application**:
   - Frontend: http://localhost:3737
   - API: http://localhost:8787
   - API Docs: http://localhost:8787/docs

5. **Login with default admin**:
   - Email: `admin@sagebase.com` (or value of `DEFAULT_ADMIN_EMAIL`)
   - Password: `Admin123!` (or value of `DEFAULT_ADMIN_PASSWORD`)
   - **Change these credentials immediately after first login!**

### Local Development

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL and Qdrant (using Docker)
docker-compose up -d postgres qdrant

# Run migrations
alembic upgrade head

# Start the server
uvicorn app.main:app --reload --port 8787
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## AI Features Guide

### AI Sidebar
- Click the **floating AI bubble** (💬) on the right side of the screen
- Opens a chat sidebar for conversations with the AI assistant
- Ask questions about your documentation or get help writing content
- Collapsible design - minimize when not in use

### AI Text Selection Popup
- **Select any text** in the editor
- An AI popup appears near your selection
- Enter a prompt like "make this more concise" or "fix grammar"
- Click Apply to replace the selected text with AI-generated content

### Context Menu AI Edit
- **Right-click** on selected text in the editor
- Choose **"Edit with AI"** from the context menu
- Opens the AI popup for inline editing

### Semantic Search
- Enable by setting `OPENAI_API_KEY` in your `.env` file
- Use the search bar with AI mode enabled
- Finds semantically similar content, not just keyword matches

## Authentication

SageBase uses **JWT (JSON Web Tokens)** for authentication:

- Tokens are stored in browser localStorage
- Tokens expire after 24 hours by default
- No public registration - admins create all user accounts

### User Roles

- **Admin**: Full access, can manage users and all content
- **Member**: Can create and edit spaces/pages
- **Viewer**: Read-only access

### Default Admin

On first startup, a default admin account is created using the environment variables:
- `DEFAULT_ADMIN_EMAIL` (default: `admin@sagebase.com`)
- `DEFAULT_ADMIN_PASSWORD` (default: `Admin123!`)

**Important**: Change these credentials via the User Management panel after first login.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POSTGRES_USER` | PostgreSQL username | `sagebase` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `sagebase_secret` |
| `POSTGRES_DB` | Database name | `sagebase` |
| `SECRET_KEY` | JWT signing key | `your-super-secret-key-change-in-production` |
| `DEFAULT_ADMIN_EMAIL` | Initial admin email | `admin@sagebase.com` |
| `DEFAULT_ADMIN_PASSWORD` | Initial admin password | `Admin123!` |
| `API_DOMAIN` | Backend API URL | `http://localhost:8787` |
| `WEBSITE_DOMAIN` | Frontend URL | `http://localhost:3737` |
| `OPENAI_API_KEY` | OpenAI API key (for AI features) | - |

### Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3737 | Next.js app |
| Backend | 8787 | FastAPI server |
| PostgreSQL | 5437 | Database |
| Qdrant HTTP | 6337 | Vector DB REST API |
| Qdrant gRPC | 6338 | Vector DB gRPC |

## Project Structure

```
sagebase/
├── frontend/                # Next.js 16 application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   ├── components/      # React components
│   │   │   ├── ai/          # AI components (Sidebar, SelectionPopup)
│   │   │   ├── editor/      # TipTap editor components
│   │   │   ├── layout/      # Layout components (Sidebar, Header)
│   │   │   └── ui/          # UI components (buttons, modals)
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript definitions
│   ├── Dockerfile
│   └── package.json
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── ai.py        # AI endpoints (chat, edit-text)
│   │   │   ├── auth.py      # Authentication endpoints
│   │   │   ├── pages.py     # Page CRUD endpoints
│   │   │   └── search.py    # Search endpoints
│   │   ├── core/            # Config, security, JWT
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic
│   │       ├── ai.py        # AI service (OpenAI integration)
│   │       └── vector.py    # Vector search service
│   ├── alembic/             # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── docker-compose.yml
└── env.example
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password

### Users (Admin only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `GET /api/users/{id}` - Get user by ID
- `PATCH /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user

### Spaces
- `GET /api/spaces` - List all spaces
- `POST /api/spaces` - Create new space
- `GET /api/spaces/{id}` - Get space by ID
- `GET /api/spaces/key/{key}` - Get space by key
- `PATCH /api/spaces/{id}` - Update space
- `DELETE /api/spaces/{id}` - Delete space

### Pages
- `GET /api/pages/space/{space_id}` - List pages in space
- `GET /api/pages/space/{space_id}/tree` - Get page tree
- `POST /api/pages` - Create new page
- `GET /api/pages/{id}` - Get page by ID
- `GET /api/pages/slug/{space_key}/{slug}` - Get page by slug
- `PATCH /api/pages/{id}` - Update page
- `DELETE /api/pages/{id}` - Delete page
- `GET /api/pages/{id}/versions` - Get version history

### Search
- `GET /api/search?q=query` - Full-text search
- `GET /api/search/semantic?q=query` - Vector/semantic search

### AI
- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/edit-text` - AI-powered text editing

### Files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/{path}` - Delete file

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TipTap** - Rich text editor
- **Tailwind CSS** - Styling
- **Zustand** - State management
- **TypeScript** - Type safety

### Backend
- **FastAPI** - Python web framework
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **OpenAI** - AI/LLM integration
- **Qdrant** - Vector database

### Infrastructure
- **PostgreSQL** - Primary database
- **Qdrant** - Vector storage for semantic search
- **Docker** - Containerization

## License

MIT

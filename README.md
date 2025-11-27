# SageBase - Internal Knowledge Base

A Confluence-like internal knowledge base with Notion-style markdown editing. Built with Next.js 16, React 19, FastAPI, PostgreSQL, and Qdrant vector database.

## Features

- **JWT Authentication**: Secure token-based authentication with admin-only user creation
- **Notion-style Editor**: Rich block-based editing with TipTap
- **Spaces**: Organize documentation by team or project
- **Hierarchical Pages**: Nested page structure
- **Full-text Search**: PostgreSQL-powered search across all content
- **Vector Search (AI)**: Semantic search using OpenAI embeddings and Qdrant
- **Version History**: Track and restore previous page versions
- **Role-based Access**: Admin, Member, and Viewer roles
- **Docker Ready**: One-command deployment with Docker Compose

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
| `OPENAI_API_KEY` | OpenAI API key (for vector search) | - |

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
│   │   ├── lib/             # Utilities and API client
│   │   └── types/           # TypeScript definitions
│   ├── Dockerfile
│   └── package.json
├── backend/                 # FastAPI application
│   ├── app/
│   │   ├── api/             # API routes
│   │   ├── core/            # Config, security, JWT
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic
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
- `PATCH /api/pages/{id}` - Update page
- `DELETE /api/pages/{id}` - Delete page
- `GET /api/pages/{id}/versions` - Get version history

### Search
- `GET /api/search?q=query` - Full-text search
- `GET /api/search/semantic?q=query` - Vector search (requires OpenAI key)

### Files
- `POST /api/files/upload` - Upload file
- `DELETE /api/files/{path}` - Delete file

## AI Features (Optional)

To enable AI-powered semantic search:

1. Set `OPENAI_API_KEY` in your `.env` file
2. Pages will be automatically indexed when saved
3. Use the `/api/search/semantic` endpoint for vector search

The system uses OpenAI's `text-embedding-3-small` model and stores vectors in Qdrant.

## License

MIT

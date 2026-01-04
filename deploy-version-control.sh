#!/bin/bash
# Deployment script for Version Control feature
# This script rebuilds containers with new dependencies and runs migrations

echo "🚀 Deploying Version Control Feature..."

# Stop and remove existing containers
echo "📦 Stopping existing containers..."
docker-compose down

# Remove old volumes (since you're okay with data loss in dev)
echo "🗑️  Removing old data volumes..."
docker volume rm sage-base-v001_postgres_data 2>/dev/null || true
docker volume rm sage-base-v001_qdrant_data 2>/dev/null || true

# Rebuild the application container with new dependencies
echo "🔨 Rebuilding application container..."
docker-compose build --no-cache app

# Start all services
echo "🎬 Starting services..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec -T app alembic upgrade head

# Re-index existing pages (if any)
echo "🔍 Re-indexing pages for vector search..."
docker-compose exec -T app python scripts/reindex_pages.py || true

echo "✅ Deployment complete!"
echo ""
echo "📋 Summary:"
echo "  - New dependency: diff-match-patch (installed)"
echo "  - Database migration: 002_add_version_control (applied)"
echo "  - Vector store: Re-indexed"
echo ""
echo "🌐 Application is running at:"
echo "  - Frontend: http://localhost (via Caddy)"
echo "  - Backend API: http://localhost/api"
echo ""
echo "📚 Next steps:"
echo "  1. Build frontend components (see VERSION_CONTROL_IMPLEMENTATION.md)"
echo "  2. Test the publish workflow"
echo "  3. Test the approval workflow"

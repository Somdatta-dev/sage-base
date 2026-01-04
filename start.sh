#!/bin/bash
set -e

echo "🚀 Starting SageBase Application..."

# Function to handle shutdown gracefully
cleanup() {
    echo "🛑 Shutting down services..."
    kill $NGINX_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $NGINX_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
# Extract host and database from DATABASE_URL
# Format: postgresql+asyncpg://user:pass@host:port/dbname
DB_HOST=$(echo $DATABASE_URL | sed -E 's|.*@([^:/]+).*|\1|')
DB_NAME=$(echo $DATABASE_URL | sed -E 's|.*/([^?]+).*|\1|')
DB_USER=$(echo $DATABASE_URL | sed -E 's|.*://([^:]+):.*|\1|')

# Wait for PostgreSQL to be ready
until PGPASSWORD="${POSTGRES_PASSWORD:-sagebase_secret}" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c '\q' > /dev/null 2>&1; do
    echo "Waiting for database connection..."
    sleep 2
done
echo "✅ PostgreSQL is ready"

# Run database migrations
echo "🔄 Running database migrations..."
cd /app/backend
alembic upgrade head
echo "✅ Migrations complete"

# Start FastAPI backend in background
echo "🐍 Starting FastAPI backend on port 8787..."
cd /app/backend
uvicorn app.main:app --host 0.0.0.0 --port 8787 &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
until curl -s http://localhost:8787/api/health > /dev/null 2>&1; do
    sleep 2
done
echo "✅ Backend is ready"

# Start Next.js frontend in background
echo "⚛️  Starting Next.js frontend on port 3000..."
cd /app/frontend
NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 node server.js &
FRONTEND_PID=$!

# Start Nginx reverse proxy
echo "🌐 Starting Nginx reverse proxy on port 80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "✅ All services started successfully!"
echo "   - Nginx Proxy: http://localhost:80"
echo "   - Backend API:  http://localhost:80/api/"
echo "   - Frontend:     http://localhost:80/"

# Wait for all processes
wait $NGINX_PID $BACKEND_PID $FRONTEND_PID

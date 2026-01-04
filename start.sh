#!/bin/bash
set -e

echo "🚀 Starting SageBase Application..."

# Function to handle shutdown gracefully
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Shutdown complete"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Wait for database to be ready
echo "⏳ Waiting for PostgreSQL..."
until curl -s ${DATABASE_URL} > /dev/null 2>&1 || [ $? -eq 52 ]; do
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

echo "✅ All services started successfully!"
echo "   - Backend:  http://localhost:8787"
echo "   - Frontend: http://localhost:3000"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

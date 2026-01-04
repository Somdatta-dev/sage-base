# =============================================================================
# Multi-stage Dockerfile for SageBase (Backend + Frontend)
# This combines FastAPI backend and Next.js frontend into a single container
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Next.js)
# -----------------------------------------------------------------------------
FROM node:24-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files and install dependencies
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source and build
COPY frontend/ ./
ARG NEXT_PUBLIC_API_URL=http://localhost:8787
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV BUILD_ID=${BUILD_ID:-production}

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Build Backend Dependencies
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS backend-builder

WORKDIR /app/backend

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 3: Final Runtime Image
# -----------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    libpq5 \
    postgresql-client \
    nodejs \
    npm \
    curl \
    nginx \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=backend-builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Copy backend application
COPY backend/ ./backend/
RUN mkdir -p /app/uploads

# Copy built frontend from builder
COPY --from=frontend-builder /app/frontend/public ./frontend/public
COPY --from=frontend-builder /app/frontend/.next/standalone ./frontend/
COPY --from=frontend-builder /app/frontend/.next/static ./frontend/.next/static

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create startup script
COPY start.sh .
RUN chmod +x start.sh

# Expose ports
# 8549 for Nginx (routes to backend:8787 and frontend:3000)
EXPOSE 8549

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8787/api/health || exit 1

# Start both services
ENTRYPOINT ["./start.sh"]

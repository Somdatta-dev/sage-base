# SageBase Deployment Guide for Coolify

This guide explains how to deploy SageBase on Coolify using the optimized unified Docker image.

## Overview

The application now uses a **single unified Docker container** that includes both:
- FastAPI backend (port 8787)
- Next.js frontend (port 3000)

This resolves the "Failed to find Server Action" errors and improves stability.

## Prerequisites

- Coolify instance running
- Domain configured in Coolify
- PostgreSQL and Qdrant services (can be deployed as separate Coolify services)

## Deployment Options

### Option 1: All-in-One Deployment (Recommended for Testing)

Deploy everything including databases in one stack:

1. In Coolify, create a new service from Docker Compose
2. Use the `docker-compose.prod.yml` file
3. Configure environment variables (see Environment Variables section below)
4. Deploy

### Option 2: Separate Services (Recommended for Production)

Deploy databases separately for better resource management:

#### Step 1: Deploy PostgreSQL

1. Create a new PostgreSQL service in Coolify
2. Set the following environment variables:
   - `POSTGRES_USER=sagebase`
   - `POSTGRES_PASSWORD=<secure-password>`
   - `POSTGRES_DB=sagebase`
3. Note the internal service URL (usually `postgres:5432` or similar)

#### Step 2: Deploy Qdrant

1. Create a new service from the Qdrant image: `qdrant/qdrant:latest`
2. Expose port 6333
3. Note the internal service URL (usually `qdrant:6333`)

#### Step 3: Deploy SageBase Application

1. Create a new service from this repository
2. Set Dockerfile path to: `./Dockerfile`
3. Configure build arguments:
   ```
   NEXT_PUBLIC_API_URL=https://yourdomain.com
   BUILD_ID=production-${COOLIFY_BUILD_ID}
   ```

4. Expose ports:
   - Port 3000 (Frontend) - map to your domain
   - Port 8787 (Backend API) - optional, can use reverse proxy

5. Set environment variables (see below)

## Environment Variables

Configure these in your Coolify service:

### Required Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://sagebase:PASSWORD@postgres:5432/sagebase

# Security (Generate using: openssl rand -hex 32)
SECRET_KEY=your-super-secret-key-change-in-production

# Domains
API_DOMAIN=https://api.yourdomain.com
WEBSITE_DOMAIN=https://yourdomain.com

# Vector Database
QDRANT_HOST=qdrant
QDRANT_PORT=6333

# AI
OPENAI_API_KEY=sk-your-openai-api-key

# Admin User
DEFAULT_ADMIN_EMAIL=admin@yourdomain.com
DEFAULT_ADMIN_PASSWORD=SecurePassword123!
```

### Optional Variables

```bash
UPLOAD_DIR=/app/uploads
NODE_ENV=production
POSTGRES_USER=sagebase
POSTGRES_PASSWORD=your-password
POSTGRES_DB=sagebase
```

## Fixing Server Action Errors

The unified Docker image includes several fixes for the "Failed to find Server Action" errors:

1. **Build ID Generation**: Each build gets a unique ID to prevent client/server mismatches
2. **Standalone Output**: Next.js uses standalone mode for optimized production builds
3. **Proper Cache Handling**: Server actions are properly cached and invalidated

### Setting Build ID in Coolify

In your Coolify service, add this build argument:
```
BUILD_ID=production-${COOLIFY_BUILD_ID:-$(date +%s)}
```

This ensures each deployment has a unique build ID.

## Health Checks

The application includes health checks:

- **Backend**: `http://localhost:8787/api/health`
- **Frontend**: `http://localhost:3000`
- **Combined**: The Docker health check automatically monitors both

## Volume Mounts

Mount these volumes for data persistence:

```
/app/uploads - File uploads
```

## Nginx Reverse Proxy (Recommended)

For production, configure Nginx to proxy both services:

```nginx
# Backend API
location /api/ {
    proxy_pass http://localhost:8787/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Frontend
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Coolify can configure this automatically if you set the correct port mappings.

## Troubleshooting

### Server Action Errors Still Occurring

1. Clear browser cache completely
2. Ensure `BUILD_ID` is set uniquely for each deployment
3. Check that both frontend and backend started successfully:
   ```bash
   docker logs sagebase-app
   ```

### Database Connection Issues

1. Verify DATABASE_URL is correct
2. Check that PostgreSQL is healthy:
   ```bash
   docker exec -it sagebase-postgres pg_isready -U sagebase
   ```

### Frontend Shows 404 Errors

1. Check that the build completed successfully
2. Verify `NEXT_PUBLIC_API_URL` is set correctly
3. Ensure the frontend process started (check logs)

### Services Won't Start

1. Check startup logs:
   ```bash
   docker logs sagebase-app -f
   ```
2. Verify all required environment variables are set
3. Ensure ports 3000 and 8787 are not already in use

## Monitoring

Monitor the application health:

```bash
# Check all services
docker ps

# View app logs
docker logs -f sagebase-app

# Check health endpoint
curl http://localhost:8787/api/health
```

## Updating the Application

1. Pull latest code
2. Rebuild in Coolify (it will use the new BUILD_ID automatically)
3. Coolify will handle zero-downtime deployment

## Performance Optimization

For better performance:

1. **Enable PostgreSQL connection pooling** in the database settings
2. **Use Redis** for session storage (optional enhancement)
3. **Configure CDN** for static assets (Next.js public folder)
4. **Increase memory limits** if handling large documents

## Security Checklist

- [ ] Changed default SECRET_KEY
- [ ] Changed default admin password
- [ ] Configured HTTPS/SSL in Coolify
- [ ] Set secure PostgreSQL password
- [ ] Restricted API access if needed
- [ ] Enabled Coolify firewall rules
- [ ] Configured backup strategy for volumes

## Backup Strategy

Important volumes to backup:

1. `postgres_data` - Database
2. `qdrant_data` - Vector embeddings
3. `uploads_data` - User uploaded files

Use Coolify's backup features or configure external backups.

## Support

If you encounter issues:

1. Check the logs: `docker logs sagebase-app -f`
2. Verify environment variables are set correctly
3. Ensure all dependencies (PostgreSQL, Qdrant) are running
4. Check Coolify documentation for service-specific issues

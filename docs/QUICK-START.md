# Quick Start Guide - SageBase on Coolify

## What Changed?

Your application now uses a **unified Docker image** that fixes the Server Action errors and improves stability.

## Files Created/Modified

1. ✅ **Dockerfile** (root) - Unified image for Backend + Frontend
2. ✅ **start.sh** - Startup script for both services
3. ✅ **docker-compose.prod.yml** - Production configuration
4. ✅ **.dockerignore** - Optimized build context
5. ✅ **.env.example** - Environment variable template
6. ✅ **frontend/next.config.ts** - Fixed Server Action errors
7. ✅ **DEPLOYMENT.md** - Complete deployment guide

## Deploy on Coolify - Quick Steps

### Method 1: Using Docker Compose (Easiest)

1. **In Coolify**, create a new service: "Docker Compose"
2. **Point to your repository** and select `docker-compose.prod.yml`
3. **Set environment variables**:
   ```bash
   SECRET_KEY=<generate-with-openssl-rand-hex-32>
   POSTGRES_PASSWORD=<secure-password>
   OPENAI_API_KEY=<your-openai-key>
   API_DOMAIN=https://api.yourdomain.com
   WEBSITE_DOMAIN=https://yourdomain.com
   DEFAULT_ADMIN_PASSWORD=<secure-password>
   ```
4. **Deploy**

### Method 2: Dockerfile Only (More Control)

1. **In Coolify**, create a new service: "Public Repository"
2. **Set Dockerfile path**: `./Dockerfile`
3. **Set build args**:
   ```
   NEXT_PUBLIC_API_URL=${API_DOMAIN}
   BUILD_ID=prod-${COOLIFY_BUILD_ID}
   ```
4. **Expose ports**: 3000 (Frontend), 8787 (API)
5. **Configure environment variables** (same as above)
6. **Deploy**

## Environment Variables (Required)

Copy from `.env.example` and set these in Coolify:

```bash
# Security
SECRET_KEY=<generate-secure-key>

# Database (if using separate PostgreSQL service)
DATABASE_URL=postgresql+asyncpg://user:password@postgres:5432/sagebase

# Or use individual vars (if using docker-compose.prod.yml)
POSTGRES_PASSWORD=<secure-password>

# Domains
API_DOMAIN=https://api.yourdomain.com
WEBSITE_DOMAIN=https://yourdomain.com

# AI
OPENAI_API_KEY=<your-key>

# Admin
DEFAULT_ADMIN_PASSWORD=<secure-password>
```

## Why This Fixes the Issues

### Server Action Errors Fixed ✅
- Added unique `BUILD_ID` for each deployment
- Configured proper Next.js standalone mode
- Added server action configuration to prevent caching issues

### Stability Improved ✅
- Single container = services start together
- Health checks ensure everything is running
- Graceful shutdown prevents data corruption
- Proper service dependencies

### 404 Errors Fixed ✅
- Frontend now serves on port 3000
- Backend API on port 8787
- Both routes properly configured

## Testing Locally

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your values
nano .env

# 3. Build and run
docker-compose -f docker-compose.prod.yml up --build

# 4. Access
# Frontend: http://localhost:3000
# Backend: http://localhost:8787/api/health
```

## Port Mappings

- **3000** → Frontend (Next.js) - Map to your domain
- **8787** → Backend API - Use for API subdomain or reverse proxy

## Verify Deployment

After deploying, check:

1. **Health endpoint**: `https://api.yourdomain.com/api/health`
   - Should return: `{"status":"healthy","service":"sagebase-api"}`

2. **Frontend**: `https://yourdomain.com`
   - Should load the login page

3. **No Server Action errors** in browser console

## Common Issues

### Still getting Server Action errors?
- Clear browser cache completely
- Check that `BUILD_ID` is set in build args
- Verify both services started (check Coolify logs)

### Can't connect to database?
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running
- Ensure network connectivity between containers

### Frontend shows blank page?
- Check Coolify build logs for errors
- Verify `NEXT_PUBLIC_API_URL` matches your API domain
- Ensure port 3000 is properly exposed

## Next Steps

1. Read [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment options
2. Configure SSL/HTTPS in Coolify
3. Set up automated backups for volumes
4. Monitor logs: `docker logs -f sagebase-app`

## Support

Check logs in Coolify or run:
```bash
docker logs sagebase-app -f
```

Look for:
- ✅ "Migrations complete"
- ✅ "Backend is ready"
- ✅ "All services started successfully"

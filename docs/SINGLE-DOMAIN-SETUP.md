# Single Domain Setup with Nginx Reverse Proxy

This configuration uses **ONE domain** with path-based routing for both frontend and backend.

## Architecture

```
Client Request → Nginx (Port 80) → Routes based on path:
                                   ├─ /api/*     → Backend (Port 8787)
                                   ├─ /uploads/* → Backend (Port 8787)
                                   └─ /*         → Frontend (Port 3000)
```

## Domain Configuration

**Single Domain**: `https://sagebase.somdatta.dev`

- **Frontend**: `https://sagebase.somdatta.dev/`
- **Backend API**: `https://sagebase.somdatta.dev/api/`
- **File Uploads**: `https://sagebase.somdatta.dev/uploads/`

## Benefits

✅ **No CORS issues** - Same domain for frontend and backend
✅ **Simpler configuration** - Only one domain to manage
✅ **Better for production** - Standard reverse proxy pattern
✅ **High timeouts** - 600s (10 minutes) for AI operations

## Files Changed

1. **[nginx.conf](nginx.conf)** - New Nginx reverse proxy configuration
2. **[Dockerfile](Dockerfile:57)** - Added Nginx installation
3. **[Dockerfile](Dockerfile:82)** - Changed exposed port to 80
4. **[start.sh](start.sh:57-60)** - Added Nginx startup
5. **[docker-compose.yml](docker-compose.yml:48)** - Changed NEXT_PUBLIC_API_URL to use WEBSITE_DOMAIN
6. **[docker-compose.yml](docker-compose.yml:53)** - Only expose port 80

## Coolify Configuration

### Environment Variables

```bash
# Only need ONE domain now
WEBSITE_DOMAIN=https://sagebase.somdatta.dev

# API_DOMAIN is no longer needed since API is at /api/
# But you can keep it for backend internal use
API_DOMAIN=https://sagebase.somdatta.dev

# Other variables remain the same
SECRET_KEY=<your-secret-key>
POSTGRES_PASSWORD=<your-password>
OPENAI_API_KEY=<your-key>
DEFAULT_ADMIN_PASSWORD=<your-password>
BUILD_ID=production
NIXPACKS_NODE_VERSION=22
```

### Port Mapping in Coolify

Map your domain to **port 80** only:

- Domain: `sagebase.somdatta.dev`
- Container Port: `80`

That's it! No need to map separate ports for frontend and backend.

## How It Works

1. **Nginx listens on port 80**
2. **Requests to `/api/*`** → Proxied to backend on port 8787
3. **Requests to `/uploads/*`** → Proxied to backend on port 8787
4. **All other requests** → Proxied to frontend on port 3000

## Deployment Steps

1. **Push changes to GitHub**:
   ```bash
   git add .
   git commit -m "Add Nginx reverse proxy for single domain setup"
   git push
   ```

2. **Update Coolify Environment Variables**:
   - Set `WEBSITE_DOMAIN=https://sagebase.somdatta.dev`
   - Remove separate backend domain configuration

3. **Configure Port Mapping**:
   - Map domain to port **80** (not 3000 or 8787)

4. **Redeploy** in Coolify

5. **Test**:
   - Frontend: `https://sagebase.somdatta.dev/`
   - Backend Health: `https://sagebase.somdatta.dev/api/health`

## Startup Sequence

```
🚀 Starting SageBase Application...
⏳ Waiting for PostgreSQL...
✅ PostgreSQL is ready
🔄 Running database migrations...
✅ Migrations complete
🐍 Starting FastAPI backend on port 8787...
✅ Backend is ready
⚛️  Starting Next.js frontend on port 3000...
🌐 Starting Nginx reverse proxy on port 80...
✅ All services started successfully!
```

## Troubleshooting

### Frontend shows 404
- Check Nginx is running: `curl http://localhost:80/`
- Check logs for Nginx errors

### API calls fail
- Test backend directly: `curl http://localhost:80/api/health`
- Check CORS settings in backend

### Still getting "no available server"
- Verify `NEXT_PUBLIC_API_URL` in build logs shows the correct domain
- Clear browser cache completely
- Check Network tab in browser dev tools for the actual URL being called

## Nginx Configuration Details

- **Connection timeout**: 600s
- **Read timeout**: 600s
- **Send timeout**: 600s
- **WebSocket support**: Enabled (for real-time features)
- **Proxy headers**: X-Real-IP, X-Forwarded-For, X-Forwarded-Proto

Perfect for long-running AI operations!

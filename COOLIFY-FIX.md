# Coolify Deployment Fix

## Issue Fixed

The deployment error was caused by an invalid environment variable template in `docker-compose.yml`:

```bash
BUILD_ID="production-${CI_COMMIT_SHA:-local"  # ❌ Invalid - unclosed quote and brace
```

This has been fixed to:

```yaml
BUILD_ID: ${BUILD_ID:-production}  # ✅ Valid
```

## What Changed

1. ✅ **[docker-compose.yml](docker-compose.yml:49)** - Fixed BUILD_ID syntax
2. ✅ **[.env](.env:28)** - Added BUILD_ID and NIXPACKS_NODE_VERSION
3. ✅ **[.env.example](.env.example:61-92)** - Added timeout settings and Nixpacks config

## How to Deploy on Coolify Now

### Step 1: Update Environment Variables in Coolify

In your Coolify service settings, **remove or update** the `BUILD_ID` variable if it has the wrong syntax.

Set these environment variables in Coolify:

```bash
# Build Configuration
BUILD_ID=production

# Node.js Version (important for Nixpacks)
NIXPACKS_NODE_VERSION=22

# Your existing variables (make sure these are correct)
API_DOMAIN=https://sagebase-backend.somdatta.dev
WEBSITE_DOMAIN=https://sagebase.somdatta.dev
SECRET_KEY=<your-secret-key>
OPENAI_API_KEY=<your-openai-key>
POSTGRES_PASSWORD=<your-postgres-password>
DEFAULT_ADMIN_PASSWORD=<your-admin-password>
```

### Step 2: Trigger Redeploy

1. Push these changes to your GitHub repository
2. In Coolify, go to your service
3. Click "Redeploy" or let it auto-deploy

### Step 3: Verify Deployment

Check the logs for:
- ✅ "Migrations complete"
- ✅ "Backend is ready"
- ✅ "All services started successfully"

## Common Coolify Issues Fixed

### 1. Build ID Error ✅
**Error**: `Invalid template: "production-${CI_COMMIT_SHA:-local"`
**Fix**: Simplified BUILD_ID to just `${BUILD_ID:-production}`

### 2. Node.js Version ✅
**Fix**: Added `NIXPACKS_NODE_VERSION=22` to ensure Node 22 is used

### 3. Timeout Issues ✅
**Fix**: Added high timeout values in `.env.example` for AI operations

## Additional Coolify Settings

### Proxy Timeout
In Coolify, you may want to increase the proxy timeout for long-running AI operations:

1. Go to your service settings
2. Find "Advanced" settings
3. Add custom label: `coolify.proxy.timeout=600`

This sets a 10-minute timeout for AI processing.

### Health Check
The application includes a built-in health check at:
```
http://localhost:8787/api/health
```

Coolify will use the Docker HEALTHCHECK automatically.

### Port Mappings

Make sure these are configured in Coolify:

- **Port 3000** → Frontend (map to your main domain)
- **Port 8787** → Backend API (map to API subdomain or use reverse proxy)

## Troubleshooting

### Still Getting Build Errors?

1. **Check Coolify environment variables** - Make sure `BUILD_ID` doesn't have the old syntax
2. **Clear build cache** - In Coolify, try "Force Rebuild"
3. **Check logs** - Look at the deployment logs for specific errors

### Application Not Starting?

1. **Check database connection** - Verify PostgreSQL is running
2. **Check environment variables** - Make sure all required vars are set
3. **Review startup logs** - Look for errors in the application logs

### Still Getting Server Action Errors?

1. **Clear browser cache completely**
2. **Verify BUILD_ID is set** correctly in Coolify
3. **Check both services started** - Backend and Frontend should both be running

## Next Steps

1. ✅ Push these changes to GitHub
2. ✅ Update environment variables in Coolify (especially `BUILD_ID`)
3. ✅ Redeploy the application
4. ✅ Verify health endpoint: `https://sagebase-backend.somdatta.dev/api/health`
5. ✅ Test the application: `https://sagebase.somdatta.dev`

## Support

If you still encounter issues, check:
1. Coolify deployment logs
2. Application logs: `docker logs -f sagebase-app`
3. Database connectivity
4. Environment variable configuration

The application should now deploy successfully on Coolify! 🚀

# 🐳 Railway Docker Fix

## Problem

Railway's Nixpacks builder was causing errors with undefined variables.

## Solution

Switched to using Docker for more reliable builds.

---

## Changes Made

### 1. Created `backend/Dockerfile`

A proper Dockerfile that:

- Uses Node.js 20 Alpine (lightweight)
- Installs dependencies
- Generates Prisma client
- Builds TypeScript
- Runs migrations on startup
- Starts the server

### 2. Updated `backend/railway.toml`

Changed from NIXPACKS to DOCKERFILE builder:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"
```

### 3. Created `backend/.dockerignore`

Excludes unnecessary files from Docker build for faster builds.

---

## 🚀 Deploy Now

### Step 1: Commit and Push

```bash
git add backend/Dockerfile backend/.dockerignore backend/railway.toml
git commit -m "Switch to Docker for Railway deployment"
git push origin main
```

### Step 2: Railway Auto-Deploys

Railway will:

1. Detect the Dockerfile
2. Build Docker image
3. Run migrations
4. Start your server

### Step 3: Monitor Deployment

1. Go to Railway dashboard
2. Click your service
3. Go to "Deployments" tab
4. Watch the build logs

---

## ✅ Expected Build Output

You should see:

```
=== Building Docker Image ===
Step 1/10 : FROM node:20-alpine
Step 2/10 : RUN apk add --no-cache openssl
Step 3/10 : WORKDIR /app
Step 4/10 : COPY package*.json ./
Step 5/10 : COPY prisma ./prisma/
Step 6/10 : RUN npm ci
Step 7/10 : COPY . .
Step 8/10 : RUN npx prisma generate
Step 9/10 : RUN npm run build
Step 10/10 : CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
✓ Build successful

=== Starting Container ===
Running migrations...
✓ Migrations applied
Starting server...
✓ Server listening on port 3001
✓ Database connected
✓ Redis connected
```

---

## 🔍 Verify Environment Variables

Make sure these are set in Railway Variables:

**Auto-provided:**

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`

**Required:**

- `NODE_ENV=production`
- `PORT=3001`
- All JWT, encryption, Discord, Kick credentials

📖 Full list: [RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)

---

## 🐛 Troubleshooting

### Build Still Fails?

**Check Railway Settings:**

1. Go to Railway → Service → Settings
2. Verify "Root Directory" is set to `backend`
3. Verify "Builder" shows "Dockerfile"

**Check Dockerfile Syntax:**

```bash
cd backend
docker build -t test .
```

**Check Environment Variables:**
Make sure all required variables are set in Railway.

### Container Starts but Crashes?

**Check Logs:**

1. Railway → Service → Deployments → View Logs
2. Look for error messages

**Common Issues:**

- Database connection failed → Check `DATABASE_URL`
- Redis connection failed → Check `REDIS_URL`
- Migration errors → Check database is accessible
- Port binding errors → Ensure `PORT=3001` is set

---

## 🎯 Advantages of Docker

✅ **More Reliable** - Consistent builds every time
✅ **Better Control** - Explicit build steps
✅ **Easier Debugging** - Can test locally with Docker
✅ **Industry Standard** - Docker is widely used
✅ **No Nixpacks Issues** - Avoids nixpacks quirks

---

## 🧪 Test Locally (Optional)

You can test the Docker build locally:

```bash
cd backend

# Build image
docker build -t streaming-backend .

# Run container (with env vars)
docker run -p 3001:3001 \
  -e DATABASE_URL="your-db-url" \
  -e REDIS_URL="your-redis-url" \
  -e NODE_ENV="production" \
  streaming-backend
```

---

## ✅ Success Indicators

Deployment is successful when:

1. ✅ Docker build completes
2. ✅ Container starts
3. ✅ Migrations run successfully
4. ✅ Server starts on port 3001
5. ✅ Database connects
6. ✅ Redis connects
7. ✅ Health check passes

Test:

```bash
curl https://your-railway-domain.up.railway.app/health
```

Expected:

```json
{ "status": "ok" }
```

---

## 🎉 Next Steps

Once deployment succeeds:

1. **Get Railway Domain**
   - Settings → Domains → Generate Domain

2. **Update Environment Variables**
   - `DISCORD_REDIRECT_URI`
   - `KICK_REDIRECT_URI`

3. **Update OAuth Redirects**
   - Discord Developer Portal
   - Kick OAuth settings

4. **Deploy Frontend to Vercel**
   - Follow [VERCEL_ENV_SETUP.md](VERCEL_ENV_SETUP.md)

---

**Docker deployment is more reliable! Push and watch it deploy. 🚀**

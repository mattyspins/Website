# 🔧 Railway Deployment Fix

## Issue Resolved

The deployment error was caused by the `nixpacks.toml` configuration. Railway's auto-detection works better for Node.js projects.

## Changes Made

### 1. Removed `nixpacks.toml`

Railway will now auto-detect your Node.js project and configure it automatically.

### 2. Simplified `railway.toml`

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npx prisma migrate deploy && node dist/index.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
healthcheckPath = "/health"
healthcheckTimeout = 100
```

### 3. Created `build.sh` (optional)

A build script for manual builds if needed.

---

## 🚀 How Railway Will Build Your App

Railway will automatically:

1. **Detect Node.js** project
2. **Install dependencies**: `npm install`
3. **Generate Prisma client**: `npx prisma generate` (auto-detected)
4. **Build TypeScript**: `npm run build` (from package.json)
5. **Run migrations**: `npx prisma migrate deploy` (from startCommand)
6. **Start server**: `node dist/index.js`

---

## ✅ Next Steps

### 1. Commit and Push Changes

```bash
git add .
git commit -m "Fix Railway deployment configuration"
git push origin main
```

### 2. Railway Will Auto-Deploy

Railway will automatically detect the push and redeploy.

### 3. Monitor Deployment

1. Go to Railway dashboard
2. Click on your service
3. Go to "Deployments" tab
4. Watch the build logs

---

## 🔍 What to Check in Railway

### Environment Variables

Make sure these are set in Railway:

#### Auto-Provided (by Railway services)

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

#### Required Variables

```bash
NODE_ENV=production
PORT=3001

# JWT
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption
ENCRYPTION_KEY=your-key
ENCRYPTION_SALT=your-salt
ENCRYPTION_IV=your-iv

# Discord OAuth
DISCORD_CLIENT_ID=your-id
DISCORD_CLIENT_SECRET=your-secret
DISCORD_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/discord/callback
DISCORD_GUILD_ID=your-guild-id
DISCORD_INVITE_URL=your-invite-url
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true

# Kick OAuth
KICK_API_BASE_URL=https://kick.com/api/v2
KICK_OAUTH_BASE_URL=https://kick.com/oauth2
KICK_CLIENT_ID=your-id
KICK_CLIENT_SECRET=your-secret
KICK_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/kick/callback
KICK_CHANNEL_NAME=mattyspins

# CORS (update after Vercel deployment)
CORS_ORIGIN=https://your-vercel-domain.vercel.app

# Other settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5
ADMIN_DISCORD_IDS=your-admin-ids
BCRYPT_ROUNDS=12
SESSION_SECRET=your-secret
WEBHOOK_SECRET=your-secret
LOG_LEVEL=info
```

---

## 🐛 Troubleshooting

### If Build Still Fails

#### Option 1: Check Build Logs

Look for specific error messages in Railway build logs.

#### Option 2: Verify package.json

Ensure these scripts exist:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

#### Option 3: Check Prisma Schema

Ensure `prisma/schema.prisma` is valid:

```bash
cd backend
npx prisma validate
```

#### Option 4: Test Build Locally

```bash
cd backend
npm install
npx prisma generate
npm run build
node dist/index.js
```

### If Deployment Succeeds but App Crashes

#### Check Environment Variables

1. Go to Railway → Your Service → Variables
2. Verify all required variables are set
3. Check for typos in variable names

#### Check Database Connection

1. Verify `DATABASE_URL=${{Postgres.DATABASE_URL}}`
2. Ensure PostgreSQL service is running
3. Check Railway logs for connection errors

#### Check Redis Connection

1. Verify `REDIS_URL=${{Redis.REDIS_URL}}`
2. Ensure Redis service is running
3. Check Railway logs for connection errors

#### Check Migrations

Railway logs should show:

```
Running migrations...
✓ Migrations applied successfully
```

If not, migrations might have failed. Check:

- Database is accessible
- Migrations are valid
- No conflicting migrations

---

## 🎯 Expected Build Output

You should see something like this in Railway logs:

```
=== Building ===
Detected Node.js project
Installing dependencies...
npm install
✓ Dependencies installed

Generating Prisma client...
npx prisma generate
✓ Prisma client generated

Building TypeScript...
npm run build
✓ Build successful

=== Deploying ===
Running migrations...
npx prisma migrate deploy
✓ Migrations applied

Starting server...
node dist/index.js
✓ Server started on port 3001
✓ Database connected
✓ Redis connected
✓ Health check passed
```

---

## 🔄 Alternative: Manual Configuration

If auto-detection still doesn't work, you can manually configure in Railway dashboard:

### Build Settings

1. Go to Railway → Your Service → Settings
2. Scroll to "Build"
3. Set:
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && node dist/index.js`

### Root Directory

Ensure it's set to `backend` if your backend is in a subdirectory.

---

## 📞 Still Having Issues?

### Check These Common Problems

1. **Wrong Root Directory**
   - Should be `backend` if backend is in subdirectory
   - Should be empty if backend is at root

2. **Missing Dependencies**
   - Check `package.json` includes all dependencies
   - Run `npm install` locally to verify

3. **TypeScript Errors**
   - Run `npm run build` locally
   - Fix any TypeScript errors

4. **Prisma Issues**
   - Run `npx prisma validate`
   - Ensure migrations are up to date

5. **Environment Variables**
   - Double-check all required variables are set
   - Verify no typos in variable names

### Get Help

- **Railway Discord**: https://discord.gg/railway
- **Railway Docs**: https://docs.railway.app
- **Railway Status**: https://status.railway.app

---

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ Build completes without errors
2. ✅ Migrations run successfully
3. ✅ Server starts on specified port
4. ✅ Database connection established
5. ✅ Redis connection established
6. ✅ Health check returns `{"status":"ok"}`

Test with:

```bash
curl https://your-railway-domain.up.railway.app/health
```

Expected response:

```json
{ "status": "ok" }
```

---

## 🎉 Next Steps After Successful Deployment

1. **Get Your Railway Domain**
   - Railway → Service → Settings → Domains
   - Copy the generated domain

2. **Update Environment Variables**
   - Update `DISCORD_REDIRECT_URI` with Railway domain
   - Update `KICK_REDIRECT_URI` with Railway domain

3. **Deploy Frontend to Vercel**
   - Follow `VERCEL_ENV_SETUP.md`

4. **Update CORS**
   - After Vercel deployment, update `CORS_ORIGIN` in Railway

5. **Test Everything**
   - Health check
   - API endpoints
   - Authentication
   - Database operations

---

**Good luck! 🚀**

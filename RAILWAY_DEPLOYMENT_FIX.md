# Railway Deployment Fix Guide

## Current Issues

1. **Health check failing** - Backend not responding to health checks
2. **Missing environment variable** - `DISCORD_BOT_TOKEN` is required but might not be set
3. **Dockerfile was referencing non-existent start.sh** (FIXED)

## Step-by-Step Fix

### 1. Update Railway Environment Variables

Go to your Railway project settings and add/verify these environment variables:

**CRITICAL - Add this missing variable:**

```
DISCORD_BOT_TOKEN=your-discord-bot-token-if-needed
```

**Note:** If you don't have a Discord bot token and don't need bot functionality, we need to make this optional in the code.

**Verify these are set correctly:**

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
JWT_REFRESH_SECRET=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
ENCRYPTION_KEY=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
ENCRYPTION_SALT=kick-oauth-encryption-salt-2024-secure
ENCRYPTION_IV=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
DISCORD_CLIENT_ID=1497558767762669670
DISCORD_CLIENT_SECRET=X8IKNd_Kyb5suw9noL4DwY66jygNKC5O
DISCORD_REDIRECT_URI=https://website-production-ece1.up.railway.app/api/auth/discord/callback
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=1488596157616885954
DISCORD_INVITE_URL=https://discord.gg/n2gCDVwebw
KICK_CLIENT_ID=01KQ8BG75STSKGMNR3YEVD9JS5
KICK_CLIENT_SECRET=b1c8ac24b472003090ab7bbfdd25e1ea1bb42c5b4d7666f78d0a47ec1eb4ff5a
KICK_REDIRECT_URI=https://website-production-ece1.up.railway.app/api/auth/kick/callback
KICK_CHANNEL_NAME=mattyspins
CORS_ORIGIN=https://website-cyan-omega-40.vercel.app
ADMIN_DISCORD_IDS=1435983820968169482,1419427173630214184
SESSION_SECRET=W7ADNG93LooAO8cB1e1MV0LDkY/lb2vq9egsxE7AI2M=
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

### 2. Option A: Make DISCORD_BOT_TOKEN Optional (Recommended)

If you don't need Discord bot functionality, I can update the code to make this optional.

### 2. Option B: Get a Discord Bot Token

1. Go to https://discord.com/developers/applications
2. Select your application (ID: 1497558767762669670)
3. Go to "Bot" section
4. Click "Reset Token" to get a new token
5. Copy the token and add it to Railway environment variables

### 3. Redeploy

After updating environment variables:

1. Go to Railway dashboard
2. Click "Deploy" or push a new commit to trigger deployment
3. Monitor the deployment logs

### 4. Verify Deployment

Once deployed, test these endpoints:

**Health Check:**

```
https://website-production-ece1.up.railway.app/health
```

**Discord Login:**

```
https://website-cyan-omega-40.vercel.app
```

## What I Fixed

✅ Removed reference to non-existent `start.sh` in Dockerfile
✅ Set NODE_ENV=production in Dockerfile
✅ Simplified CMD to directly run the application

## Next Steps After Deployment Works

1. Re-enable background job in `backend/src/index.ts` (uncomment `LeaderboardExpirationJob.start()`)
2. Update Discord OAuth redirect URI in Discord Developer Portal
3. Test full authentication flow

## Troubleshooting

If health check still fails:

1. Check Railway Deploy Logs for startup errors
2. Look for environment validation errors
3. Verify DATABASE_URL and REDIS_URL are correctly linked
4. Check if port 3001 is being used correctly

If Discord login fails:

1. Verify CORS_ORIGIN matches your Vercel domain exactly
2. Check DISCORD_REDIRECT_URI is correct
3. Verify Discord OAuth credentials are valid
4. Check Railway HTTP Logs for 502 errors

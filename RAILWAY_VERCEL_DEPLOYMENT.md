# 🚀 Railway + Vercel Deployment Guide

Complete guide to deploy your streaming platform using Railway (backend) and Vercel (frontend).

## 📋 Overview

- **Backend**: Railway (Node.js + PostgreSQL + Redis)
- **Frontend**: Vercel (Next.js)
- **Cost**: ~$5-20/month (Railway) + Free (Vercel)
- **Time**: 30-45 minutes

## ✅ Prerequisites

- [ ] GitHub account with your code pushed
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Discord Developer Application configured
- [ ] Kick OAuth credentials (if using Kick integration)

---

## 🎯 Part 1: Railway Backend Deployment

### Step 1: Create Railway Project

1. Go to https://railway.app/dashboard
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your repository
6. Railway will detect your project structure

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL instance
4. Note: The `DATABASE_URL` variable will be automatically available

### Step 3: Add Redis

1. Click **"+ New"** again
2. Select **"Database"** → **"Add Redis"**
3. Railway will automatically create a Redis instance
4. Note: The `REDIS_URL` variable will be automatically available

### Step 4: Configure Backend Service

1. Click on your backend service (the one from GitHub)
2. Go to **"Settings"** tab
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install && npm run build`
5. Set **Start Command**: `npm start`

### Step 5: Configure Environment Variables

Click on **"Variables"** tab and add these variables:

#### Required Variables

```bash
# Application
NODE_ENV=production
PORT=3001

# Database (automatically provided by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (automatically provided by Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Configuration (use your existing secrets or generate new ones)
JWT_SECRET=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
JWT_REFRESH_SECRET=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (use your existing keys)
ENCRYPTION_KEY=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
ENCRYPTION_SALT=kick-oauth-encryption-salt-2024-secure
ENCRYPTION_IV=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=

# Discord OAuth (from your Discord Developer Portal)
DISCORD_CLIENT_ID=1497558767762669670
DISCORD_CLIENT_SECRET=X8IKNd_Kyb5suw9noL4DwY66jygNKC5O
DISCORD_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/discord/callback
DISCORD_BOT_TOKEN=your-discord-bot-token-if-needed

# Discord Server Settings
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=1488596157616885954
DISCORD_INVITE_URL=https://discord.gg/n2gCDVwebw

# Kick OAuth Configuration
KICK_API_BASE_URL=https://kick.com/api/v2
KICK_OAUTH_BASE_URL=https://kick.com/oauth2
KICK_CLIENT_ID=01KQ8BG75STSKGMNR3YEVD9JS5
KICK_CLIENT_SECRET=b1c8ac24b472003090ab7bbfdd25e1ea1bb42c5b4d7666f78d0a47ec1eb4ff5a
KICK_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/kick/callback
KICK_CHANNEL_NAME=mattyspins

# CORS (will update after Vercel deployment)
CORS_ORIGIN=https://your-vercel-domain.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Points Configuration
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5

# Admin Configuration
ADMIN_DISCORD_IDS=1435983820968169482,1419427173630214184

# Logging
LOG_LEVEL=info

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=W7ADNG93LooAO8cB1e1MV0LDkY/lb2vq9egsxE7AI2M=

# Webhook
WEBHOOK_SECRET=mattyspins-webhook-secret-2024
```

### Step 6: Get Your Railway Domain

1. Go to **"Settings"** tab
2. Scroll to **"Domains"** section
3. Click **"Generate Domain"**
4. Copy your domain (e.g., `your-app-name.up.railway.app`)
5. **Important**: Update these variables with your Railway domain:
   - `DISCORD_REDIRECT_URI`
   - `KICK_REDIRECT_URI`

### Step 7: Deploy Backend

1. Railway will automatically deploy after you save variables
2. Monitor deployment in the **"Deployments"** tab
3. Check logs for any errors
4. Once deployed, test the health endpoint: `https://your-railway-domain.up.railway.app/health`

### Step 8: Run Database Migrations

Railway should automatically run migrations via the nixpacks.toml configuration. If not:

1. Go to your backend service
2. Click on **"Settings"** → **"Deploy"**
3. Add to start command: `npx prisma migrate deploy && node dist/index.js`

Or manually run via Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run npx prisma migrate deploy
```

---

## 🌐 Part 2: Vercel Frontend Deployment

### Step 1: Prepare Frontend

1. Ensure your frontend code is in the `frontend/` directory
2. Make sure `package.json` has correct build scripts

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm install` (auto-detected)

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts and select settings
```

### Step 3: Configure Environment Variables in Vercel

1. In Vercel project settings, go to **"Environment Variables"**
2. Add these variables for **Production**, **Preview**, and **Development**:

```bash
NEXT_PUBLIC_API_URL=https://your-railway-domain.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-domain.up.railway.app
```

**Replace** `your-railway-domain.up.railway.app` with your actual Railway domain!

### Step 4: Redeploy Frontend

After adding environment variables:

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Click **"Redeploy"** to apply new environment variables

### Step 5: Get Your Vercel Domain

1. Your app will be available at: `your-project-name.vercel.app`
2. You can add a custom domain in **"Settings"** → **"Domains"**

---

## 🔄 Part 3: Update Cross-References

### Update Railway CORS_ORIGIN

1. Go back to Railway dashboard
2. Open your backend service
3. Go to **"Variables"** tab
4. Update `CORS_ORIGIN` to your Vercel domain:
   ```
   CORS_ORIGIN=https://your-project-name.vercel.app
   ```
5. Save (Railway will auto-redeploy)

### Update Discord OAuth Redirect

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to **"OAuth2"** → **"General"**
4. Update **Redirects** to include:
   ```
   https://your-vercel-domain.vercel.app/auth/callback
   ```
5. Save changes

### Update Kick OAuth Redirect (if using)

1. Go to your Kick developer settings
2. Update redirect URI to:
   ```
   https://your-vercel-domain.vercel.app/auth/callback
   ```

---

## ✅ Part 4: Verification & Testing

### Test Backend

1. **Health Check**:

   ```bash
   curl https://your-railway-domain.up.railway.app/health
   ```

   Should return: `{"status":"ok"}`

2. **Database Connection**:
   Check Railway logs for successful database connection

3. **Redis Connection**:
   Check Railway logs for successful Redis connection

### Test Frontend

1. Visit `https://your-vercel-domain.vercel.app`
2. Check that the page loads correctly
3. Open browser console for any errors

### Test Authentication

1. Click **"Login with Discord"** on your frontend
2. Should redirect to Discord OAuth
3. After authorization, should redirect back to your app
4. Check if user is logged in

### Test API Integration

1. Try creating a leaderboard (if admin)
2. Check if points system works
3. Test real-time features (Socket.IO)

---

## 🔧 Troubleshooting

### Backend Issues

#### "Cannot connect to database"

- Check `DATABASE_URL` in Railway variables
- Ensure PostgreSQL service is running
- Check Railway logs for connection errors

#### "Redis connection failed"

- Check `REDIS_URL` in Railway variables
- Ensure Redis service is running
- Verify Redis is in the same Railway project

#### "CORS errors"

- Verify `CORS_ORIGIN` matches your Vercel domain exactly
- Include `https://` in the URL
- Check for trailing slashes

### Frontend Issues

#### "API calls failing"

- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check Railway backend is running
- Test API endpoint directly in browser

#### "Environment variables not working"

- Ensure variables start with `NEXT_PUBLIC_`
- Redeploy after adding variables
- Check Vercel deployment logs

#### "Socket.IO not connecting"

- Verify `NEXT_PUBLIC_SOCKET_URL` matches Railway domain
- Check Railway logs for WebSocket errors
- Ensure Railway allows WebSocket connections

### Authentication Issues

#### "Discord OAuth not working"

- Verify redirect URI in Discord Developer Portal
- Check `DISCORD_REDIRECT_URI` in Railway
- Ensure it matches: `https://your-vercel-domain.vercel.app/auth/callback`

#### "Kick OAuth not working"

- Verify Kick OAuth credentials
- Check redirect URI configuration
- Ensure Kick API is accessible

---

## 📊 Monitoring & Maintenance

### Railway Monitoring

1. **View Logs**:
   - Go to your service → **"Deployments"** → Click deployment → **"View Logs"**

2. **Metrics**:
   - Check CPU, Memory, Network usage in Railway dashboard

3. **Database Management**:
   - Use Railway's built-in database viewer
   - Or connect with: `railway connect postgres`

### Vercel Monitoring

1. **Analytics**:
   - Enable Vercel Analytics in project settings

2. **Logs**:
   - View function logs in **"Deployments"** → Click deployment → **"Functions"**

3. **Performance**:
   - Check Core Web Vitals in Vercel dashboard

---

## 💰 Cost Breakdown

### Railway Costs

- **Hobby Plan**: $5/month
  - Includes $5 credit
  - Pay for usage beyond credit
  - Typical usage: $5-15/month for small apps

- **Services**:
  - Backend API: ~$3-8/month
  - PostgreSQL: ~$2-5/month
  - Redis: ~$1-3/month

### Vercel Costs

- **Hobby Plan**: FREE
  - Perfect for personal projects
  - 100GB bandwidth
  - Unlimited deployments

- **Pro Plan**: $20/month (if needed)
  - More bandwidth
  - Team features
  - Advanced analytics

**Total Estimated Cost**: $5-20/month

---

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Code pushed to GitHub
- [ ] Discord OAuth app configured
- [ ] Kick OAuth credentials ready (if using)
- [ ] Railway account created
- [ ] Vercel account created

### Railway Setup

- [ ] Project created from GitHub
- [ ] PostgreSQL database added
- [ ] Redis added
- [ ] Environment variables configured
- [ ] Railway domain generated
- [ ] Backend deployed successfully
- [ ] Database migrations run
- [ ] Health check passes

### Vercel Setup

- [ ] Project imported from GitHub
- [ ] Root directory set to `frontend`
- [ ] Environment variables configured
- [ ] Frontend deployed successfully
- [ ] Vercel domain noted

### Cross-References Updated

- [ ] Railway `CORS_ORIGIN` updated with Vercel domain
- [ ] Discord OAuth redirect URI updated
- [ ] Kick OAuth redirect URI updated (if using)
- [ ] Frontend API URLs point to Railway

### Testing Complete

- [ ] Backend health check works
- [ ] Frontend loads correctly
- [ ] Discord authentication works
- [ ] Kick authentication works (if using)
- [ ] API calls successful
- [ ] Socket.IO connects
- [ ] Admin panel accessible
- [ ] Database operations work

---

## 🎉 Success!

Your streaming platform is now live!

- **Frontend**: https://your-project-name.vercel.app
- **Backend API**: https://your-railway-domain.up.railway.app
- **Admin Panel**: https://your-project-name.vercel.app/admin

### Next Steps

1. **Custom Domain** (Optional):
   - Add custom domain in Vercel
   - Update Railway CORS_ORIGIN
   - Update OAuth redirect URIs

2. **Monitoring**:
   - Set up error tracking (Sentry)
   - Enable Vercel Analytics
   - Monitor Railway metrics

3. **Backups**:
   - Railway automatically backs up PostgreSQL
   - Consider additional backup strategy for critical data

4. **Security**:
   - Review all environment variables
   - Rotate secrets regularly
   - Monitor access logs

---

## 📞 Need Help?

### Railway Support

- Documentation: https://docs.railway.app
- Discord: https://discord.gg/railway
- Status: https://status.railway.app

### Vercel Support

- Documentation: https://vercel.com/docs
- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

### Project Issues

- Check Railway logs for backend errors
- Check Vercel logs for frontend errors
- Review browser console for client-side errors
- Test API endpoints individually

---

**Happy Streaming! 🎮🎉**

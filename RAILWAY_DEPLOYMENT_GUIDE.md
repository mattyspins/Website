# 🚂 Railway + Vercel Deployment Guide

## Why Railway + Vercel?

- ⚡ **Fastest deployment**: 15-20 minutes total
- 💰 **Most affordable**: $0-5/month
- 🎯 **Easiest setup**: No complex configuration
- 🔄 **Auto-deploy**: Push to GitHub = automatic deployment
- 🎁 **Free tier**: $5 credit monthly
- 🗄️ **Built-in database**: PostgreSQL and Redis included
- 🔒 **Automatic SSL**: Free HTTPS for custom domains

## 💰 Cost Breakdown

### Railway Costs

- **Free tier**: $5 credit/month (renews monthly)
- **Usage-based pricing**: $0.000463/GB-second
- **Typical usage**: $0-5/month for small apps
- **Database**: Included in compute costs
- **Redis**: Included in compute costs

### Vercel Costs

- **Hobby plan**: FREE forever
- **Bandwidth**: 100GB/month free
- **Builds**: Unlimited

### Total Monthly Cost: $0-5

---

## 📋 Prerequisites

- [ ] GitHub account
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Discord OAuth app configured
- [ ] Your code pushed to GitHub

---

## 🚀 Part 1: Backend Deployment (Railway)

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Click "Start a New Project"
3. Sign in with GitHub
4. Authorize Railway to access your repositories

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your MattySpins repository
4. Railway will detect it's a Node.js project

### Step 3: Configure Backend Service

1. **Set Root Directory**:
   - Click on your service
   - Go to "Settings"
   - Set "Root Directory" to `backend`

2. **Configure Build & Start Commands**:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Watch Paths**: `backend/**`

3. **Set Environment Variables**:
   Click "Variables" tab and add:

```env
NODE_ENV=production
PORT=3001

# These will be set after creating database
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Generate these secrets
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters-long
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Discord OAuth (from Discord Developer Portal)
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback

# CORS (will update after Vercel deployment)
CORS_ORIGIN=https://yourdomain.vercel.app

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Step 4: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically:
   - Create a PostgreSQL instance
   - Generate `DATABASE_URL` variable
   - Link it to your backend service

4. The `DATABASE_URL` will be automatically available as `${{Postgres.DATABASE_URL}}`

### Step 5: Add Redis

1. Click "New" again
2. Select "Database" → "Add Redis"
3. Railway will automatically:
   - Create a Redis instance
   - Generate `REDIS_URL` variable
   - Link it to your backend service

4. The `REDIS_URL` will be automatically available as `${{Redis.REDIS_URL}}`

### Step 6: Run Database Migrations

1. Go to your backend service
2. Click "Settings" → "Deploy"
3. Add a deploy command:
   ```bash
   npm run build && npx prisma migrate deploy && npm start
   ```

Or run migrations manually:

1. Click on your service
2. Go to "Settings" → "Service"
3. Click "Open Terminal"
4. Run: `npx prisma migrate deploy`

### Step 7: Get Your Backend URL

1. Go to "Settings" → "Networking"
2. Click "Generate Domain"
3. Railway will give you a URL like: `mattyspins-api.up.railway.app`
4. Copy this URL - you'll need it for the frontend

### Step 8: Configure Custom Domain (Optional)

1. Go to "Settings" → "Networking"
2. Click "Custom Domain"
3. Add your domain: `api.yourdomain.com`
4. Update your DNS:
   - Type: CNAME
   - Name: api
   - Value: your-railway-domain.up.railway.app

---

## 🎨 Part 2: Frontend Deployment (Vercel)

### Step 1: Prepare Frontend

Make sure your `frontend` directory has:

- `package.json`
- `next.config.js`
- `vercel.json` (already created)

### Step 2: Deploy to Vercel

#### Option A: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

5. Add Environment Variables:

   ```env
   NEXT_PUBLIC_API_URL=https://mattyspins-api.up.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://mattyspins-api.up.railway.app
   ```

   (Use your Railway backend URL from Step 7)

6. Click "Deploy"

#### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend
cd frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set root directory to current directory
# - Override settings? No (use vercel.json)

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://mattyspins-api.up.railway.app

vercel env add NEXT_PUBLIC_SOCKET_URL
# Enter: https://mattyspins-api.up.railway.app

# Deploy to production
vercel --prod
```

### Step 3: Get Your Frontend URL

Vercel will give you a URL like:

- `mattyspins.vercel.app`

### Step 4: Update Backend CORS

1. Go back to Railway
2. Open your backend service
3. Go to "Variables"
4. Update `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=https://mattyspins.vercel.app
   ```
5. Railway will automatically redeploy

### Step 5: Configure Custom Domain (Optional)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your domain: `yourdomain.com`
4. Follow Vercel's DNS instructions
5. Update Railway `CORS_ORIGIN` to your custom domain

---

## 🔧 Configuration Files

### Railway Configuration (railway.json)

Create `backend/railway.json`:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install && npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Nixpacks Configuration (nixpacks.toml)

Create `backend/nixpacks.toml`:

```toml
[phases.setup]
nixPkgs = ["nodejs-18_x"]

[phases.install]
cmds = ["npm ci --only=production"]

[phases.build]
cmds = ["npm run build"]

[start]
cmd = "npm start"
```

### Vercel Configuration (already created)

Your `frontend/vercel.json` is already configured.

---

## ✅ Testing Your Deployment

### Test Backend

```bash
# Health check
curl https://mattyspins-api.up.railway.app/health

# Leaderboards endpoint
curl https://mattyspins-api.up.railway.app/api/manual-leaderboards

# Expected response:
# {"success":true,"leaderboards":[...]}
```

### Test Frontend

1. Open `https://mattyspins.vercel.app`
2. Test features:
   - Homepage loads
   - Navigation works
   - Login with Discord
   - View leaderboards
   - Admin panel (if admin)

### Test Integration

1. Try logging in
2. Check if API calls work
3. Test real-time features
4. Verify database operations

---

## 🔄 Automatic Deployments

### How It Works

Railway and Vercel both support automatic deployments:

1. **Push to GitHub** → Automatic deployment
2. **Pull Request** → Preview deployment
3. **Merge to main** → Production deployment

### Configure Auto-Deploy

#### Railway

- Already enabled by default
- Every push to `main` triggers deployment
- View logs in Railway dashboard

#### Vercel

- Already enabled by default
- Every push creates preview deployment
- Merge to `main` deploys to production

---

## 📊 Monitoring & Logs

### Railway Monitoring

1. Go to your project dashboard
2. Click on your service
3. View:
   - **Metrics**: CPU, Memory, Network usage
   - **Logs**: Real-time application logs
   - **Deployments**: Deployment history

### Vercel Monitoring

1. Go to your project dashboard
2. View:
   - **Analytics**: Page views, performance
   - **Logs**: Function logs and errors
   - **Deployments**: Deployment history

---

## 💡 Tips & Best Practices

### Railway Tips

1. **Monitor Usage**:
   - Check usage in "Usage" tab
   - Set up billing alerts
   - $5 credit renews monthly

2. **Optimize Costs**:
   - Use sleep mode for dev environments
   - Monitor memory usage
   - Clean up unused services

3. **Database Backups**:
   - Railway doesn't auto-backup on free tier
   - Set up manual backups
   - Use `pg_dump` regularly

### Vercel Tips

1. **Environment Variables**:
   - Use different values for preview/production
   - Never commit secrets to Git

2. **Performance**:
   - Enable Edge Functions if needed
   - Use Image Optimization
   - Monitor Core Web Vitals

3. **Custom Domains**:
   - Add both www and non-www
   - Enable automatic HTTPS
   - Use Vercel DNS for best performance

---

## 🆘 Troubleshooting

### Backend Issues

**Build Fails**

```bash
# Check Railway logs
# Common issues:
# - Missing dependencies
# - TypeScript errors
# - Environment variables not set

# Solution: Check build logs in Railway dashboard
```

**Database Connection Failed**

```bash
# Verify DATABASE_URL is set
# Check if PostgreSQL service is running
# Ensure migrations ran successfully

# Run migrations manually:
# Railway dashboard → Service → Terminal
npx prisma migrate deploy
```

**Redis Connection Failed**

```bash
# Verify REDIS_URL is set
# Check if Redis service is running
# Test connection in Railway terminal
```

### Frontend Issues

**Build Fails**

```bash
# Check Vercel build logs
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Import errors

# Solution: Check build logs in Vercel dashboard
```

**API Calls Fail**

```bash
# Check NEXT_PUBLIC_API_URL is correct
# Verify CORS_ORIGIN in backend
# Check network tab in browser DevTools
```

**CORS Errors**

```bash
# Update CORS_ORIGIN in Railway
# Must match your Vercel domain exactly
# Include protocol (https://)
```

---

## 🎉 Success Checklist

- [ ] Railway project created
- [ ] PostgreSQL database added
- [ ] Redis added
- [ ] Backend deployed successfully
- [ ] Environment variables configured
- [ ] Database migrations ran
- [ ] Backend URL obtained
- [ ] Vercel project created
- [ ] Frontend deployed successfully
- [ ] Frontend environment variables set
- [ ] CORS updated in backend
- [ ] Health check passes
- [ ] Login works
- [ ] Leaderboards load
- [ ] Admin panel accessible
- [ ] Custom domains configured (optional)

---

## 📞 Support Resources

- **Railway Documentation**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Vercel Documentation**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support

---

## 🚀 Next Steps

1. **Set up monitoring**: Configure alerts for errors
2. **Add custom domains**: Professional appearance
3. **Configure backups**: Protect your data
4. **Optimize performance**: Monitor and improve
5. **Scale as needed**: Upgrade when you grow

**Estimated Deployment Time**: 15-20 minutes
**Monthly Cost**: $0-5
**Difficulty**: ⭐ Easy

Congratulations! Your MattySpins website is now live on Railway + Vercel! 🎊

# ✅ Pre-Deployment Checklist

Complete this checklist BEFORE starting deployment to ensure smooth process.

---

## 📋 Code Repository

- [ ] All code committed to Git
- [ ] Code pushed to GitHub
- [ ] Repository is accessible (public or Railway/Vercel have access)
- [ ] No sensitive data in repository (check `.gitignore`)
- [ ] Latest changes tested locally

### Verify Files Present

```bash
# Backend files
backend/package.json
backend/prisma/schema.prisma
backend/railway.toml
backend/nixpacks.toml
backend/src/index.ts

# Frontend files
frontend/package.json
frontend/next.config.js
frontend/app/layout.tsx
```

---

## 🔐 Credentials & Accounts

### Railway Account

- [ ] Account created at https://railway.app
- [ ] GitHub connected to Railway
- [ ] Payment method added (for usage beyond free tier)
- [ ] Email verified

### Vercel Account

- [ ] Account created at https://vercel.com
- [ ] GitHub connected to Vercel
- [ ] Email verified

### Discord Developer

- [ ] Application created at https://discord.com/developers/applications
- [ ] OAuth2 configured
- [ ] Client ID and Secret available
- [ ] Bot token available (if using bot features)

### Kick Developer (if using)

- [ ] OAuth application created
- [ ] Client ID and Secret available
- [ ] Redirect URIs configured

---

## 🔑 Environment Variables Ready

### Backend Variables (from `backend/.env`)

Copy these values - you'll need them for Railway:

```bash
# JWT Secrets
JWT_SECRET=_______________________
JWT_REFRESH_SECRET=_______________________

# Encryption Keys
ENCRYPTION_KEY=_______________________
ENCRYPTION_SALT=_______________________
ENCRYPTION_IV=_______________________

# Discord OAuth
DISCORD_CLIENT_ID=_______________________
DISCORD_CLIENT_SECRET=_______________________
DISCORD_GUILD_ID=_______________________
DISCORD_INVITE_URL=_______________________

# Kick OAuth
KICK_CLIENT_ID=_______________________
KICK_CLIENT_SECRET=_______________________
KICK_CHANNEL_NAME=_______________________

# Admin IDs
ADMIN_DISCORD_IDS=_______________________

# Security
SESSION_SECRET=_______________________
WEBHOOK_SECRET=_______________________
```

### Verify Secrets Are Secure

- [ ] JWT_SECRET is at least 32 characters
- [ ] ENCRYPTION_KEY is exactly 32 characters
- [ ] All secrets are random and unique
- [ ] No secrets are committed to Git

### Generate New Secrets (if needed)

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use OpenSSL
openssl rand -base64 32
```

---

## 🗄️ Database Preparation

### Schema Verification

- [ ] `backend/prisma/schema.prisma` is up to date
- [ ] All migrations are in `backend/prisma/migrations/`
- [ ] Migrations tested locally
- [ ] No pending schema changes

### Test Local Database

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Verify database
npx prisma studio
```

---

## 🔧 Build Verification

### Test Backend Build

```bash
cd backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Verify dist/ folder created
ls dist/

# Test start command
npm start
# Should start without errors
```

### Test Frontend Build

```bash
cd frontend

# Install dependencies
npm install

# Build Next.js
npm run build

# Verify .next/ folder created
ls .next/

# Test production start
npm start
# Should start without errors
```

---

## 🌐 Domain & DNS (Optional)

If using custom domain:

- [ ] Domain purchased
- [ ] DNS access available
- [ ] SSL certificate plan (Vercel provides free)

---

## 📱 Discord OAuth Setup

### Application Configuration

1. Go to https://discord.com/developers/applications
2. Select your application
3. Verify these settings:

#### OAuth2 → General

- [ ] Client ID copied
- [ ] Client Secret copied
- [ ] Redirects includes: `http://localhost:3001/api/auth/discord/callback` (for testing)

#### Bot (if using)

- [ ] Bot created
- [ ] Token copied
- [ ] Permissions configured
- [ ] Bot invited to your server

#### Server Settings

- [ ] Server ID copied (right-click server → Copy Server ID)
- [ ] Developer mode enabled in Discord settings

---

## 🎮 Kick OAuth Setup (if using)

- [ ] Kick OAuth application created
- [ ] Client ID available
- [ ] Client Secret available
- [ ] Redirect URI configured
- [ ] Channel name verified

---

## 🧪 Local Testing Complete

### Backend Tests

- [ ] Server starts: `npm run dev`
- [ ] Health endpoint works: `http://localhost:3001/health`
- [ ] Database connects successfully
- [ ] Redis connects successfully (if running locally)
- [ ] Discord OAuth works locally
- [ ] API endpoints respond correctly

### Frontend Tests

- [ ] App starts: `npm run dev`
- [ ] Pages load without errors
- [ ] API calls work (to local backend)
- [ ] Authentication flow works
- [ ] No console errors

### Integration Tests

- [ ] Frontend connects to backend
- [ ] Login flow completes
- [ ] User data persists
- [ ] Real-time features work (Socket.IO)
- [ ] Admin panel accessible

---

## 📦 Dependencies Check

### Backend Dependencies

```bash
cd backend
npm audit
npm outdated
```

- [ ] No critical vulnerabilities
- [ ] All dependencies install successfully
- [ ] No deprecated packages (or acceptable)

### Frontend Dependencies

```bash
cd frontend
npm audit
npm outdated
```

- [ ] No critical vulnerabilities
- [ ] All dependencies install successfully
- [ ] No deprecated packages (or acceptable)

---

## 📝 Documentation Review

- [ ] README.md is up to date
- [ ] API documentation exists (if needed)
- [ ] Environment variable examples provided
- [ ] Deployment guides reviewed

---

## 🔍 Configuration Files

### Backend Configuration

- [ ] `backend/package.json` has correct scripts
- [ ] `backend/railway.toml` exists
- [ ] `backend/nixpacks.toml` exists
- [ ] `backend/tsconfig.json` is correct
- [ ] `backend/.gitignore` excludes sensitive files

### Frontend Configuration

- [ ] `frontend/package.json` has correct scripts
- [ ] `frontend/next.config.js` is correct
- [ ] `frontend/tsconfig.json` is correct
- [ ] `frontend/.gitignore` excludes sensitive files

---

## 🚨 Security Check

### Sensitive Data

- [ ] No API keys in code
- [ ] No passwords in code
- [ ] No tokens in code
- [ ] `.env` files in `.gitignore`
- [ ] No sensitive data in Git history

### Verify .gitignore

```bash
# Check what's ignored
git status --ignored

# Should include:
# node_modules/
# .env
# .env.local
# dist/
# .next/
```

### Test Git Repository

```bash
# Search for potential secrets
git grep -i "password"
git grep -i "secret"
git grep -i "token"
git grep -i "api_key"

# Should only find variable names, not actual values
```

---

## 💾 Backup Current State

Before deploying:

- [ ] Local database backed up (if has important data)
- [ ] Environment variables documented
- [ ] Current working state committed to Git
- [ ] Git tag created for this version

```bash
# Create backup tag
git tag -a v1.0.0-pre-deploy -m "Pre-deployment backup"
git push origin v1.0.0-pre-deploy
```

---

## 📊 Resource Planning

### Estimate Usage

**Backend (Railway)**

- Expected requests per day: **\_\_\_**
- Database size estimate: **\_\_\_**
- Redis memory needed: **\_\_\_**
- Expected monthly cost: $10-20

**Frontend (Vercel)**

- Expected page views per day: **\_\_\_**
- Expected bandwidth: **\_\_\_**
- Expected monthly cost: $0 (free tier)

### Budget Approval

- [ ] Budget approved for Railway (~$10-20/month)
- [ ] Payment method ready
- [ ] Billing alerts configured

---

## 🎯 Deployment Plan

### Timeline

- [ ] Deployment time scheduled (allow 30-45 minutes)
- [ ] Backup time available if issues occur
- [ ] Team notified (if applicable)

### Rollback Plan

- [ ] Know how to rollback Railway deployment
- [ ] Know how to rollback Vercel deployment
- [ ] Local backup available
- [ ] Previous Git commit identified

---

## ✅ Final Checks

### Before Starting Deployment

- [ ] All items above completed
- [ ] Documentation guides ready
- [ ] Environment variables copied and ready to paste
- [ ] Discord/Kick credentials available
- [ ] Railway and Vercel accounts ready
- [ ] GitHub repository accessible
- [ ] Time allocated for deployment
- [ ] Internet connection stable

### Have These Open

- [ ] Railway dashboard: https://railway.app/dashboard
- [ ] Vercel dashboard: https://vercel.com/dashboard
- [ ] Discord Developer Portal: https://discord.com/developers/applications
- [ ] GitHub repository
- [ ] Deployment guides:
  - `RAILWAY_VERCEL_DEPLOYMENT.md`
  - `QUICK_DEPLOY_CHECKLIST.md`
  - `RAILWAY_ENV_SETUP.md`
  - `VERCEL_ENV_SETUP.md`

---

## 🚀 Ready to Deploy!

If all items are checked, you're ready to start deployment!

**Next Steps:**

1. Open `QUICK_DEPLOY_CHECKLIST.md` for step-by-step deployment
2. Or follow `RAILWAY_VERCEL_DEPLOYMENT.md` for detailed guide
3. Keep this checklist handy for reference

---

## 📞 Emergency Contacts

Before deploying, note these:

**Railway Support**

- Discord: https://discord.gg/railway
- Status: https://status.railway.app

**Vercel Support**

- Discord: https://vercel.com/discord
- Status: https://vercel-status.com

**Your Team** (if applicable)

- Technical lead: **********\_\_\_**********
- DevOps contact: **********\_\_\_**********
- Emergency contact: **********\_\_\_**********

---

**Good luck with your deployment! 🚀**

_Remember: Take your time, follow the guides, and test thoroughly!_

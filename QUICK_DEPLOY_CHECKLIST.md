# ⚡ Quick Deploy Checklist

Use this as a quick reference while deploying. Full guide: `RAILWAY_VERCEL_DEPLOYMENT.md`

## 🎯 Railway Backend (15 mins)

### 1. Create Project

- [ ] Go to https://railway.app/dashboard
- [ ] New Project → Deploy from GitHub
- [ ] Select your repository

### 2. Add Databases

- [ ] Add PostgreSQL (+ New → Database → PostgreSQL)
- [ ] Add Redis (+ New → Database → Redis)

### 3. Configure Service

- [ ] Settings → Root Directory: `backend`
- [ ] Settings → Generate Domain
- [ ] Copy domain: `__________________.up.railway.app`

### 4. Add Environment Variables

Copy from `backend/.env` and update:

**Critical Updates Needed:**

```bash
# Update these with your Railway domain:
DISCORD_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/discord/callback
KICK_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/kick/callback

# Will update after Vercel deployment:
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app

# Auto-provided by Railway:
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

**Copy these as-is from your .env:**

- JWT_SECRET
- JWT_REFRESH_SECRET
- ENCRYPTION_KEY
- ENCRYPTION_SALT
- ENCRYPTION_IV
- DISCORD_CLIENT_ID
- DISCORD_CLIENT_SECRET
- DISCORD_GUILD_ID
- KICK_CLIENT_ID
- KICK_CLIENT_SECRET
- ADMIN_DISCORD_IDS
- SESSION_SECRET

### 5. Deploy & Test

- [ ] Wait for deployment to complete
- [ ] Test: `curl https://YOUR-RAILWAY-DOMAIN.up.railway.app/health`
- [ ] Should return: `{"status":"ok"}`

---

## 🌐 Vercel Frontend (10 mins)

### 1. Deploy

- [ ] Go to https://vercel.com/dashboard
- [ ] New Project → Import from GitHub
- [ ] Select your repository
- [ ] Root Directory: `frontend`

### 2. Environment Variables

Add these in Vercel project settings:

```bash
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

### 3. Redeploy

- [ ] Deployments → Latest → Redeploy
- [ ] Copy your Vercel domain: `__________________.vercel.app`

---

## 🔄 Update Cross-References (5 mins)

### 1. Update Railway

- [ ] Go back to Railway
- [ ] Variables → Update `CORS_ORIGIN` with Vercel domain
- [ ] Save (auto-redeploys)

### 2. Update Discord OAuth

- [ ] https://discord.com/developers/applications
- [ ] Your App → OAuth2 → Redirects
- [ ] Add: `https://YOUR-VERCEL-DOMAIN.vercel.app/auth/callback`

### 3. Update Kick OAuth (if using)

- [ ] Update Kick redirect URI to Vercel domain

---

## ✅ Final Tests

### Backend

- [ ] Health: `https://YOUR-RAILWAY-DOMAIN.up.railway.app/health`
- [ ] Check Railway logs for errors

### Frontend

- [ ] Visit: `https://YOUR-VERCEL-DOMAIN.vercel.app`
- [ ] Page loads without errors
- [ ] Check browser console

### Authentication

- [ ] Click "Login with Discord"
- [ ] Successfully redirects and logs in
- [ ] User profile shows correctly

---

## 🎉 Done!

**Your URLs:**

- Frontend: `https://__________________.vercel.app`
- Backend: `https://__________________.up.railway.app`
- Admin: `https://__________________.vercel.app/admin`

---

## 🆘 Quick Troubleshooting

**CORS errors?**
→ Check `CORS_ORIGIN` in Railway matches Vercel domain exactly

**API not connecting?**
→ Check `NEXT_PUBLIC_API_URL` in Vercel matches Railway domain

**Discord auth fails?**
→ Verify redirect URI in Discord Developer Portal

**Database errors?**
→ Check Railway logs, ensure migrations ran

**Need detailed help?**
→ See `RAILWAY_VERCEL_DEPLOYMENT.md`

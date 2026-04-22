# 🆓 FREE Deployment Guide - Test Your Website Publicly

Deploy your website **100% FREE** to test it publicly before committing to paid hosting!

## 🎯 Best Free Option: Render + Vercel

**Total Cost**: $0/month
**Limitations**:

- Backend sleeps after 15 min of inactivity (wakes up in ~30 seconds)
- 750 hours/month free (enough for testing)
- Perfect for testing and small traffic

---

## 🚀 Quick Setup (30 minutes)

### Step 1: Push to GitHub (5 min)

```bash
# In your project root
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/mattyspins.git
git push -u origin main
```

---

### Step 2: Deploy Backend on Render (FREE) - 15 min

#### 2.1 Create Render Account

1. Go to https://render.com
2. Sign up with GitHub (FREE)
3. Authorize Render

#### 2.2 Create PostgreSQL Database (FREE)

1. Click "New +" → "PostgreSQL"
2. **Name**: `mattyspins-db`
3. **Database**: `mattyspins`
4. **User**: `mattyspins`
5. **Region**: Choose closest to you
6. **Plan**: **Free** (select this!)
7. Click "Create Database"
8. **Copy the "Internal Database URL"** - you'll need this!

#### 2.3 Create Redis (FREE)

1. Click "New +" → "Redis"
2. **Name**: `mattyspins-redis`
3. **Plan**: **Free** (select this!)
4. Click "Create Redis"
5. **Copy the "Internal Redis URL"** - you'll need this!

#### 2.4 Deploy Backend Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. **Configure**:
   - **Name**: `mattyspins-backend`
   - **Region**: Same as database
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npx prisma migrate deploy && node dist/index.js`
   - **Plan**: **Free** (select this!)

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

```bash
NODE_ENV=production
PORT=3001

# Database (paste your Internal Database URL from step 2.2)
DATABASE_URL=postgresql://mattyspins:...@...render.com/mattyspins

# Redis (paste your Internal Redis URL from step 2.3)
REDIS_URL=redis://...render.com:6379

# JWT Secrets (generate random strings)
JWT_SECRET=your_random_secret_32_characters_long
JWT_REFRESH_SECRET=another_random_secret_32_chars
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# CORS (we'll update this after frontend deploys)
CORS_ORIGIN=http://localhost:3000

# Discord OAuth
DISCORD_CLIENT_ID=your_discord_client_id
DISCORD_CLIENT_SECRET=your_discord_client_secret
DISCORD_REDIRECT_URI=https://mattyspins-backend.onrender.com/api/auth/discord/callback
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_INVITE_URL=https://discord.gg/your-invite

# Admin
ADMIN_DISCORD_IDS=your_discord_user_id

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

5. Click "Create Web Service"
6. Wait for deployment (~5 minutes)
7. **Copy your backend URL**: `https://mattyspins-backend.onrender.com`

---

### Step 3: Deploy Frontend on Vercel (FREE) - 5 min

1. Go to https://vercel.com
2. Sign up with GitHub (FREE)
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. **Configure**:
   - **Framework**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

6. **Add Environment Variable**:

   ```
   NEXT_PUBLIC_API_URL=https://mattyspins-backend.onrender.com
   ```

7. Click "Deploy"
8. Wait for deployment (~3 minutes)
9. **Copy your frontend URL**: `https://mattyspins.vercel.app`

---

### Step 4: Connect Everything (5 min)

#### 4.1 Update Backend CORS

1. Go to Render dashboard
2. Click on your backend service
3. Go to "Environment"
4. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN=https://mattyspins.vercel.app
   ```
5. Click "Save Changes"
6. Backend will redeploy automatically

#### 4.2 Update Discord Redirect URI

1. Go to https://discord.com/developers/applications
2. Select your application
3. Go to OAuth2 → General
4. Update Redirect URI:
   ```
   https://mattyspins-backend.onrender.com/api/auth/discord/callback
   ```
5. Click "Save Changes"

---

### Step 5: Test Your Website! 🎉

1. Visit your Vercel URL: `https://mattyspins.vercel.app`
2. Click "Discord" login
3. Authorize with Discord
4. You should be logged in!
5. Test all features

---

## 🆓 Alternative: Railway Free Trial

Railway gives you **$5 free credit** (no credit card required initially):

1. Go to https://railway.app
2. Sign up with GitHub
3. Follow the same steps as the paid Railway option
4. You get $5 credit = ~500 hours of usage
5. Perfect for testing!

**When credit runs out**: Add payment method or switch to Render

---

## 🆓 100% Free Forever Options

### Option 1: Render (Current Setup)

- ✅ **Backend**: Free (sleeps after 15 min)
- ✅ **Frontend**: Vercel Free
- ✅ **Database**: PostgreSQL Free (90 days, then expires)
- ✅ **Redis**: Free (25MB)
- ⚠️ **Limitation**: Database expires after 90 days

### Option 2: Supabase + Vercel

- ✅ **Backend**: Deploy on Vercel (serverless)
- ✅ **Frontend**: Vercel Free
- ✅ **Database**: Supabase Free (500MB, forever)
- ❌ **Redis**: Not included (would need to remove Redis features)

### Option 3: Fly.io Free Tier

- ✅ **Backend**: Free (3 shared-cpu VMs)
- ✅ **Frontend**: Vercel Free
- ✅ **Database**: Free (3GB)
- ✅ **Redis**: Free (256MB)
- ⚠️ **Limitation**: Requires credit card for verification

---

## ⚠️ Free Tier Limitations

### Render Free Tier:

- **Backend sleeps** after 15 minutes of inactivity
- **Wake-up time**: ~30 seconds on first request
- **750 hours/month** free (enough for testing)
- **Database**: Expires after 90 days (can recreate)

### What This Means:

- First visitor after 15 min wait will see ~30 sec loading
- Perfect for testing and demos
- Not ideal for production with real users
- Upgrade to paid ($7/month) for always-on backend

---

## 💡 Testing Strategy

### Phase 1: Free Testing (Now)

1. Deploy on Render + Vercel (FREE)
2. Test all features
3. Invite a few friends to test
4. Fix any bugs
5. Get feedback

### Phase 2: Public Launch (Later)

1. Upgrade Render to paid ($7/month) OR
2. Switch to Railway ($5/month)
3. Add custom domain
4. Invite all users
5. Monitor and scale

---

## 🔄 Upgrading Later

When you're ready to upgrade (backend stays awake):

### Render Upgrade:

1. Go to your backend service
2. Click "Upgrade to Starter" ($7/month)
3. Add payment method
4. Done! Backend stays awake 24/7

### Switch to Railway:

1. Export database from Render
2. Follow Railway deployment guide
3. Import database to Railway
4. Update frontend API URL
5. Done!

---

## 📊 Cost Comparison

| Service     | Free         | Paid                     |
| ----------- | ------------ | ------------------------ |
| **Render**  | $0 (sleeps)  | $7/month (always-on)     |
| **Railway** | $5 credit    | $5-10/month              |
| **Vercel**  | $0 (forever) | $20/month (pro features) |
| **Fly.io**  | $0 (limited) | $5-10/month              |

**Recommendation for Testing**: Render Free + Vercel Free = **$0/month**

**Recommendation for Production**: Railway ($5-10) + Vercel Free = **$5-10/month**

---

## 🆘 Troubleshooting Free Deployment

### "Backend is slow to respond"

→ Normal! Free tier sleeps. First request takes ~30 seconds.

### "Database connection failed"

→ Check DATABASE_URL is the "Internal Database URL" from Render

### "Redis connection failed"

→ Check REDIS_URL is the "Internal Redis URL" from Render

### "CORS error"

→ Update CORS_ORIGIN in Render to match your Vercel URL

### "Discord login not working"

→ Update Discord redirect URI to match your Render backend URL

---

## ✅ Free Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render account created (FREE)
- [ ] PostgreSQL database created on Render (FREE)
- [ ] Redis created on Render (FREE)
- [ ] Backend deployed on Render (FREE)
- [ ] Vercel account created (FREE)
- [ ] Frontend deployed on Vercel (FREE)
- [ ] CORS updated
- [ ] Discord redirect URI updated
- [ ] Website tested and working

**Total Cost**: $0/month ✅

---

## 🎉 Success!

Your website is now **publicly accessible** at:

- **Frontend**: `https://mattyspins.vercel.app`
- **Backend**: `https://mattyspins-backend.onrender.com`

Share the frontend URL with friends to test!

**Note**: First load after 15 min of inactivity will be slow (~30 sec). This is normal for free tier.

---

## 🚀 Next Steps

1. **Test everything** - Make sure all features work
2. **Invite friends** - Get feedback
3. **Fix bugs** - Improve based on feedback
4. **Decide**: Keep free or upgrade to paid
5. **Add domain** - When ready for production

---

## 💰 When to Upgrade?

Upgrade to paid hosting when:

- ✅ You have regular users (not just testing)
- ✅ 30-second wake-up time is annoying
- ✅ You want 24/7 availability
- ✅ You're ready to launch publicly
- ✅ You have a custom domain

Until then, **FREE is perfect for testing!** 🎉

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Vercel Docs**: https://vercel.com/docs
- **Vercel Discord**: https://discord.gg/vercel

Good luck with your free deployment! 🚀

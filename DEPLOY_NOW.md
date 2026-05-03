# 🚀 Deploy MattySpins to Railway + Vercel NOW!

Your code is ready! Follow these steps to deploy in the next 15 minutes.

## ✅ Prerequisites Completed

- [x] Code pushed to GitHub: https://github.com/Samhith06/Website-v2
- [x] Deployment files configured
- [x] Ready to deploy!

---

## 🚂 Part 1: Deploy Backend to Railway (8 minutes)

### Step 1: Create Railway Account (2 minutes)

1. **Open Railway**: https://railway.app
2. **Click "Login"** or "Start a New Project"
3. **Sign in with GitHub**
4. **Authorize Railway** to access your repositories

### Step 2: Create New Project (1 minute)

1. Click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Search for and select: **"Samhith06/Website-v2"**
4. Railway will start analyzing your repository

### Step 3: Configure Backend Service (2 minutes)

1. **Click on the service** that Railway created
2. Go to **"Settings"** tab
3. **Set Root Directory**:
   - Scroll to "Root Directory"
   - Enter: `backend`
   - Click "Update"

4. **Verify Build Settings** (should auto-detect):
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

### Step 4: Add PostgreSQL Database (1 minute)

1. In your Railway project dashboard, click **"New"**
2. Select **"Database"**
3. Click **"Add PostgreSQL"**
4. Railway will automatically:
   - Create PostgreSQL instance
   - Generate DATABASE_URL
   - Link it to your backend service

### Step 5: Add Redis (1 minute)

1. Click **"New"** again
2. Select **"Database"**
3. Click **"Add Redis"**
4. Railway will automatically:
   - Create Redis instance
   - Generate REDIS_URL
   - Link it to your backend service

### Step 6: Set Environment Variables (3 minutes)

1. Click on your **backend service**
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add each of these:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

**Generate Secrets** (use these commands or generate your own):

```bash
# For JWT_SECRET (copy the output)
openssl rand -base64 32

# For ENCRYPTION_KEY (copy the output - must be exactly 32 characters)
openssl rand -hex 16
```

Add these variables:

```env
JWT_SECRET=<paste-your-generated-secret>
ENCRYPTION_KEY=<paste-your-generated-key>
```

**Discord OAuth** (from your Discord Developer Portal):

```env
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback
```

**CORS** (we'll update this after Vercel deployment):

```env
CORS_ORIGIN=https://yourdomain.vercel.app
```

**Rate Limiting**:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. Click **"Add"** for each variable

### Step 7: Deploy & Get URL (1 minute)

1. Railway will **automatically deploy** after you add variables
2. Wait for deployment to complete (watch the logs)
3. Once deployed, go to **"Settings"** → **"Networking"**
4. Click **"Generate Domain"**
5. **Copy your Railway URL**: `something.up.railway.app`
6. **Save this URL** - you'll need it for Vercel!

### Step 8: Run Database Migrations (1 minute)

**Option A: Automatic (Recommended)**

- Railway should run migrations automatically via nixpacks.toml
- Check logs to verify migrations ran

**Option B: Manual**

1. Click on your backend service
2. Go to **"Settings"**
3. Scroll to **"Service"**
4. Click **"Open Terminal"** (if available)
5. Run: `npx prisma migrate deploy`

---

## 🎨 Part 2: Deploy Frontend to Vercel (5 minutes)

### Step 1: Create Vercel Account (1 minute)

1. **Open Vercel**: https://vercel.com
2. **Click "Sign Up"** or "Login"
3. **Sign in with GitHub**
4. **Authorize Vercel**

### Step 2: Import Project (2 minutes)

1. Click **"Add New"** → **"Project"**
2. Find and select: **"Samhith06/Website-v2"**
3. Click **"Import"**

4. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: Click "Edit" → Enter `frontend`
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)
   - **Install Command**: `npm install` (auto-filled)

### Step 3: Add Environment Variables (2 minutes)

Before clicking "Deploy", add environment variables:

1. Scroll down to **"Environment Variables"**
2. Add these variables:

**Variable 1:**

- Name: `NEXT_PUBLIC_API_URL`
- Value: `https://your-railway-url.up.railway.app` (use your Railway URL from Part 1, Step 7)

**Variable 2:**

- Name: `NEXT_PUBLIC_SOCKET_URL`
- Value: `https://your-railway-url.up.railway.app` (same as above)

3. Click **"Deploy"**

### Step 4: Wait for Deployment (1 minute)

1. Vercel will build and deploy your frontend
2. Watch the build logs
3. Once complete, you'll see: **"Congratulations!"**
4. **Copy your Vercel URL**: `something.vercel.app`

---

## 🔄 Part 3: Final Configuration (2 minutes)

### Step 1: Update CORS in Railway (1 minute)

1. Go back to **Railway dashboard**
2. Click on your **backend service**
3. Go to **"Variables"** tab
4. Find **CORS_ORIGIN** variable
5. Click **"Edit"**
6. Update value to: `https://your-vercel-url.vercel.app`
7. Click **"Update"**
8. Railway will automatically redeploy

### Step 2: Update Discord OAuth (1 minute)

1. Go to **Discord Developer Portal**: https://discord.com/developers/applications
2. Select your application
3. Go to **"OAuth2"** → **"General"**
4. Update **Redirect URI** to: `https://your-vercel-url.vercel.app/auth/callback`
5. Click **"Save Changes"**

---

## ✅ Testing Your Deployment (2 minutes)

### Test Backend

Open your browser or use curl:

```bash
# Health check
https://your-railway-url.up.railway.app/health

# Should return: {"status":"OK",...}
```

### Test Frontend

1. Open: `https://your-vercel-url.vercel.app`
2. Verify:
   - [ ] Homepage loads
   - [ ] Navigation works
   - [ ] Can click "Login with Discord"

### Test Integration

1. Try logging in with Discord
2. Check if leaderboards load
3. Test admin panel (if you're admin)

---

## 🎉 Success Checklist

- [ ] Railway account created
- [ ] Backend service deployed
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] Environment variables set
- [ ] Backend URL obtained
- [ ] Vercel account created
- [ ] Frontend deployed
- [ ] Frontend environment variables set
- [ ] CORS updated in Railway
- [ ] Discord OAuth updated
- [ ] Backend health check passes
- [ ] Frontend loads successfully
- [ ] Login works
- [ ] Leaderboards display

---

## 🆘 Troubleshooting

### Backend Build Fails

**Check Railway logs:**

1. Click on your service
2. View "Deployments" tab
3. Click on failed deployment
4. Read error messages

**Common issues:**

- Missing environment variables
- TypeScript errors
- Database connection issues

### Frontend Build Fails

**Check Vercel logs:**

1. Go to your project
2. Click on failed deployment
3. Read build logs

**Common issues:**

- Missing environment variables
- API URL incorrect
- Import errors

### CORS Errors

1. Verify CORS_ORIGIN in Railway matches your Vercel URL exactly
2. Include `https://` protocol
3. No trailing slash
4. Railway will redeploy automatically after updating

### Database Connection Error

1. Verify DATABASE_URL is set to `${{Postgres.DATABASE_URL}}`
2. Check PostgreSQL service is running
3. Run migrations manually if needed

---

## 📊 Your Deployment URLs

**Backend (Railway):**

- URL: `https://your-railway-url.up.railway.app`
- Health: `https://your-railway-url.up.railway.app/health`
- API: `https://your-railway-url.up.railway.app/api`

**Frontend (Vercel):**

- URL: `https://your-vercel-url.vercel.app`
- Admin: `https://your-vercel-url.vercel.app/admin`

**Database:**

- PostgreSQL: Managed by Railway
- Redis: Managed by Railway

---

## 💰 Cost Tracking

**Railway:**

- Free tier: $5 credit/month
- Monitor usage in Railway dashboard
- Typical usage: $0-5/month

**Vercel:**

- Hobby plan: FREE
- 100GB bandwidth/month
- Unlimited builds

---

## 🚀 Next Steps After Deployment

1. **Add Custom Domain** (Optional):
   - Railway: Settings → Networking → Custom Domain
   - Vercel: Settings → Domains

2. **Set Up Monitoring**:
   - Railway: Built-in metrics
   - Vercel: Analytics tab

3. **Configure Backups**:
   - Set up database backups
   - Export data regularly

4. **Optimize Performance**:
   - Monitor Railway usage
   - Check Vercel analytics

---

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support

---

**Total Time**: 15 minutes
**Cost**: $0-5/month
**Status**: Ready to deploy! 🚀

Let's go! Start with Part 1, Step 1 above!

# 🚀 Deploy to Railway + Vercel

**Quick and easy deployment guide for your streaming platform**

---

## ⚡ Quick Start (30 minutes)

### Step 1: Prepare (5 mins)

```bash
✓ Code pushed to GitHub
✓ Railway account ready
✓ Vercel account ready
✓ Discord OAuth configured
```

### Step 2: Deploy Backend to Railway (15 mins)

```bash
1. Create project from GitHub
2. Add PostgreSQL + Redis
3. Set environment variables
4. Deploy!
```

### Step 3: Deploy Frontend to Vercel (10 mins)

```bash
1. Import from GitHub
2. Set root directory: frontend
3. Add environment variables
4. Deploy!
```

### Step 4: Connect (5 mins)

```bash
✓ Update CORS in Railway
✓ Update OAuth redirects
✓ Test authentication
✓ Done! 🎉
```

---

## 📚 Documentation

### 🎯 Choose Your Guide

| Guide                                                            | Best For                | Time    |
| ---------------------------------------------------------------- | ----------------------- | ------- |
| **[QUICK_DEPLOY_CHECKLIST.md](QUICK_DEPLOY_CHECKLIST.md)**       | Experienced developers  | 30 mins |
| **[RAILWAY_VERCEL_DEPLOYMENT.md](RAILWAY_VERCEL_DEPLOYMENT.md)** | First-time deployers    | 45 mins |
| **[PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md)**   | Preparation             | 15 mins |
| **[DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)**                   | Finding the right guide | 5 mins  |

### 🔐 Environment Setup

| Guide                                            | Purpose                        |
| ------------------------------------------------ | ------------------------------ |
| **[RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)** | Backend environment variables  |
| **[VERCEL_ENV_SETUP.md](VERCEL_ENV_SETUP.md)**   | Frontend environment variables |

### 📊 Reference

| Guide                                              | Purpose                 |
| -------------------------------------------------- | ----------------------- |
| **[DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)** | Architecture & overview |

---

## 🎯 Deployment Architecture

```
┌─────────────┐
│    Users    │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Vercel Frontend │  ← Next.js App
│ (Free)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Railway Backend │  ← Express API
│ ($10-20/month)  │
└────┬───────┬────┘
     │       │
     ▼       ▼
  [DB]    [Redis]
```

---

## 💰 Cost

- **Railway**: ~$10-20/month (Backend + Database + Redis)
- **Vercel**: FREE (Frontend)
- **Total**: ~$10-20/month

---

## ✅ What You'll Deploy

### Backend (Railway)

- ✅ Express API
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ Socket.IO
- ✅ Discord/Kick OAuth

### Frontend (Vercel)

- ✅ Next.js App
- ✅ Admin Panel
- ✅ User Dashboard
- ✅ Real-time Updates

---

## 🚀 Quick Deploy Commands

### Railway Backend

```bash
# Railway will automatically:
1. Detect Node.js project
2. Run: npm install
3. Run: npm run build
4. Run: npx prisma migrate deploy
5. Start: npm start
```

### Vercel Frontend

```bash
# Vercel will automatically:
1. Detect Next.js project
2. Run: npm install
3. Run: npm run build
4. Deploy to edge network
```

---

## 🔐 Environment Variables

### Backend (Railway) - 30+ variables

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=your-secret
DISCORD_CLIENT_ID=your-id
DISCORD_CLIENT_SECRET=your-secret
CORS_ORIGIN=https://your-vercel-app.vercel.app
# ... and more
```

📖 Full list: [RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)

### Frontend (Vercel) - 2 variables

```bash
NEXT_PUBLIC_API_URL=https://your-railway-app.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-app.up.railway.app
```

📖 Full guide: [VERCEL_ENV_SETUP.md](VERCEL_ENV_SETUP.md)

---

## 🧪 Testing Your Deployment

### Backend Health Check

```bash
curl https://your-railway-app.up.railway.app/health
# Expected: {"status":"ok"}
```

### Frontend

```bash
# Visit your Vercel domain
https://your-vercel-app.vercel.app

# Check:
✓ Page loads
✓ No console errors
✓ Login works
✓ API connects
```

---

## 🆘 Troubleshooting

### CORS Errors?

→ Update `CORS_ORIGIN` in Railway to match Vercel domain

### API Not Connecting?

→ Check `NEXT_PUBLIC_API_URL` in Vercel

### Database Errors?

→ Check Railway logs, verify migrations ran

### Auth Not Working?

→ Update OAuth redirect URIs in Discord/Kick

📖 Detailed troubleshooting: [RAILWAY_VERCEL_DEPLOYMENT.md](RAILWAY_VERCEL_DEPLOYMENT.md)

---

## 📞 Support

### Documentation

- 📚 [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) - Find the right guide
- 🎯 [QUICK_DEPLOY_CHECKLIST.md](QUICK_DEPLOY_CHECKLIST.md) - Fast deployment
- 📖 [RAILWAY_VERCEL_DEPLOYMENT.md](RAILWAY_VERCEL_DEPLOYMENT.md) - Detailed guide

### Platform Support

- Railway: https://discord.gg/railway
- Vercel: https://vercel.com/discord

### Platform Status

- Railway: https://status.railway.app
- Vercel: https://vercel-status.com

---

## 🎉 Success!

After deployment, you'll have:

- ✅ Live frontend at `https://your-app.vercel.app`
- ✅ Live backend at `https://your-app.up.railway.app`
- ✅ Admin panel at `https://your-app.vercel.app/admin`
- ✅ Automatic deployments on Git push
- ✅ SSL certificates (free)
- ✅ Monitoring dashboards

---

## 🚀 Ready to Deploy?

### Option 1: Quick Deploy (30 mins)

**For experienced developers**

1. Open [QUICK_DEPLOY_CHECKLIST.md](QUICK_DEPLOY_CHECKLIST.md)
2. Follow the checklist
3. Done! 🎉

### Option 2: Guided Deploy (60 mins)

**For first-time deployers**

1. Read [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md) (5 mins)
2. Complete [PRE_DEPLOYMENT_CHECKLIST.md](PRE_DEPLOYMENT_CHECKLIST.md) (15 mins)
3. Follow [RAILWAY_VERCEL_DEPLOYMENT.md](RAILWAY_VERCEL_DEPLOYMENT.md) (45 mins)
4. Done! 🎉

### Option 3: Need Help Choosing?

**Not sure which path to take?**

Start with [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md) to find the right guide for you.

---

## 📋 Deployment Checklist

- [ ] Code in GitHub
- [ ] Railway account created
- [ ] Vercel account created
- [ ] Discord OAuth configured
- [ ] Environment variables ready
- [ ] Guides reviewed
- [ ] Time allocated (30-60 mins)
- [ ] Ready to deploy! 🚀

---

## 🎯 Next Steps After Deployment

1. **Test Everything**
   - Authentication
   - API endpoints
   - Real-time features
   - Admin panel

2. **Set Up Monitoring**
   - Enable Vercel Analytics
   - Configure Railway alerts
   - Set up error tracking

3. **Custom Domain** (Optional)
   - Add domain in Vercel
   - Update CORS in Railway
   - Update OAuth redirects

4. **Optimize**
   - Review performance
   - Configure caching
   - Monitor costs

---

**Happy Deploying! 🚀**

_Questions? Start with [DEPLOYMENT_INDEX.md](DEPLOYMENT_INDEX.md)_

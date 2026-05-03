# 🔐 My MattySpins Deployment Information

## 📋 Quick Reference

### GitHub Repository

- **URL**: https://github.com/Samhith06/Website-v2
- **Branch**: main
- **Status**: ✅ Ready for deployment

### Generated Secrets (SAVE THESE!)

```env
JWT_SECRET=Itzc63naBipOojkKme61BjcuiHiHKdliZgXOyZ/jCQc=
ENCRYPTION_KEY=ee8d160b2d61634153a943adedbf8234
```

⚠️ **IMPORTANT**: Save these secrets securely! You'll need them for Railway.

---

## 🚂 Railway Environment Variables

Copy and paste these into Railway dashboard:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=Itzc63naBipOojkKme61BjcuiHiHKdliZgXOyZ/jCQc=
ENCRYPTION_KEY=ee8d160b2d61634153a943adedbf8234
DISCORD_CLIENT_ID=your-discord-client-id-here
DISCORD_CLIENT_SECRET=your-discord-client-secret-here
DISCORD_REDIRECT_URI=https://yourdomain.vercel.app/auth/callback
CORS_ORIGIN=https://yourdomain.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**TODO**: Replace these values:

- `DISCORD_CLIENT_ID` - Get from Discord Developer Portal
- `DISCORD_CLIENT_SECRET` - Get from Discord Developer Portal
- `DISCORD_REDIRECT_URI` - Update with your Vercel URL after deployment
- `CORS_ORIGIN` - Update with your Vercel URL after deployment

---

## 🎨 Vercel Environment Variables

Add these in Vercel dashboard:

```env
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-url.up.railway.app
```

**TODO**: Replace `your-railway-url.up.railway.app` with your actual Railway URL

---

## 📝 Deployment Steps

### 1. Railway Backend (8 minutes)

1. Go to https://railway.app
2. Sign in with GitHub
3. New Project → Deploy from GitHub
4. Select: Samhith06/Website-v2
5. Set Root Directory: `backend`
6. Add PostgreSQL database
7. Add Redis database
8. Add environment variables (see above)
9. Generate domain
10. Copy Railway URL

### 2. Vercel Frontend (5 minutes)

1. Go to https://vercel.com
2. Sign in with GitHub
3. Import: Samhith06/Website-v2
4. Set Root Directory: `frontend`
5. Add environment variables (see above)
6. Deploy
7. Copy Vercel URL

### 3. Update URLs (2 minutes)

1. Update CORS_ORIGIN in Railway with Vercel URL
2. Update Discord OAuth redirect URI
3. Test deployment

---

## 🔗 Useful Links

### Deployment Platforms

- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard

### Discord OAuth

- **Developer Portal**: https://discord.com/developers/applications
- **Your Application**: [Add your Discord app URL here]

### Documentation

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **Deployment Guide**: See DEPLOY_NOW.md

---

## ✅ Deployment Checklist

### Pre-Deployment

- [x] Code pushed to GitHub
- [x] Secrets generated
- [ ] Discord OAuth app configured
- [ ] Railway account created
- [ ] Vercel account created

### Railway Deployment

- [ ] Project created
- [ ] Backend service configured
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] Environment variables set
- [ ] Backend deployed
- [ ] Railway URL obtained

### Vercel Deployment

- [ ] Project imported
- [ ] Root directory set
- [ ] Environment variables added
- [ ] Frontend deployed
- [ ] Vercel URL obtained

### Post-Deployment

- [ ] CORS updated in Railway
- [ ] Discord OAuth redirect updated
- [ ] Backend health check passes
- [ ] Frontend loads
- [ ] Login works
- [ ] Leaderboards display

---

## 🆘 Emergency Contacts

### If Something Goes Wrong

**Railway Issues:**

- Check logs in Railway dashboard
- Visit: https://discord.gg/railway
- Docs: https://docs.railway.app

**Vercel Issues:**

- Check build logs in Vercel dashboard
- Support: https://vercel.com/support
- Docs: https://vercel.com/docs

**Database Issues:**

- Check Railway PostgreSQL logs
- Verify DATABASE_URL is set correctly
- Run migrations: `npx prisma migrate deploy`

---

## 📊 After Deployment

### Your Live URLs (Fill in after deployment)

**Backend:**

- Railway URL: `https://________________.up.railway.app`
- Health Check: `https://________________.up.railway.app/health`
- API Endpoint: `https://________________.up.railway.app/api`

**Frontend:**

- Vercel URL: `https://________________.vercel.app`
- Admin Panel: `https://________________.vercel.app/admin`
- Leaderboards: `https://________________.vercel.app/leaderboard`

**Database:**

- PostgreSQL: Managed by Railway
- Redis: Managed by Railway

---

## 💰 Cost Tracking

**Railway:**

- Free tier: $5 credit/month (renews monthly)
- Current usage: Check Railway dashboard
- Estimated: $0-5/month

**Vercel:**

- Hobby plan: FREE
- Bandwidth: 100GB/month free
- Builds: Unlimited

**Total Estimated Cost: $0-5/month**

---

## 🎉 Success!

Once deployed, your MattySpins website will be live at:

- **Frontend**: https://your-app.vercel.app
- **Backend API**: https://your-api.up.railway.app

**Next Steps:**

1. Test all features
2. Add custom domain (optional)
3. Set up monitoring
4. Share with users!

---

**Created**: $(date)
**Status**: Ready to deploy
**Repository**: https://github.com/Samhith06/Website-v2

🚀 **Let's deploy!** Follow the steps in DEPLOY_NOW.md

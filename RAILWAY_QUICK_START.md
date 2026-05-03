# 🚂 Railway Quick Start - 15 Minute Deployment

Deploy MattySpins to Railway + Vercel in just 15 minutes!

## ⚡ Prerequisites (2 minutes)

- [ ] GitHub account with your code pushed
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (sign up at https://vercel.com)
- [ ] Discord OAuth app configured

## 🚀 Step-by-Step Deployment

### Part 1: Backend on Railway (8 minutes)

#### 1. Create Project (1 min)

```
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
```

#### 2. Configure Service (2 min)

```
1. Click on your service
2. Settings → Set "Root Directory" to "backend"
3. Build Command: npm install && npm run build
4. Start Command: npm start
```

#### 3. Add Database (2 min)

```
1. Click "New" → "Database" → "Add PostgreSQL"
2. Click "New" → "Database" → "Add Redis"
3. Both will auto-link to your service
```

#### 4. Set Environment Variables (3 min)

```
Go to "Variables" tab and add:

NODE_ENV=production
PORT=3001
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=your-32-char-secret
ENCRYPTION_KEY=your-32-char-key
DISCORD_CLIENT_ID=your-id
DISCORD_CLIENT_SECRET=your-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback
CORS_ORIGIN=https://yourdomain.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 5. Deploy & Get URL (1 min)

```
1. Railway auto-deploys
2. Settings → Networking → "Generate Domain"
3. Copy URL: mattyspins-api.up.railway.app
```

### Part 2: Frontend on Vercel (5 minutes)

#### 1. Import Project (2 min)

```
1. Go to https://vercel.com/dashboard
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Set Root Directory: frontend
5. Framework: Next.js (auto-detected)
```

#### 2. Add Environment Variables (2 min)

```
Add in Vercel dashboard:

NEXT_PUBLIC_API_URL=https://mattyspins-api.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://mattyspins-api.up.railway.app
```

#### 3. Deploy (1 min)

```
1. Click "Deploy"
2. Wait for build to complete
3. Get URL: mattyspins.vercel.app
```

### Part 3: Final Configuration (2 minutes)

#### 1. Update CORS (1 min)

```
1. Go back to Railway
2. Update CORS_ORIGIN variable:
   CORS_ORIGIN=https://mattyspins.vercel.app
3. Railway auto-redeploys
```

#### 2. Test Deployment (1 min)

```bash
# Test backend
curl https://mattyspins-api.up.railway.app/health

# Test frontend
# Open https://mattyspins.vercel.app in browser
```

## ✅ Success Checklist

- [ ] Railway project created
- [ ] PostgreSQL added
- [ ] Redis added
- [ ] Environment variables set
- [ ] Backend deployed
- [ ] Backend URL obtained
- [ ] Vercel project created
- [ ] Frontend environment variables set
- [ ] Frontend deployed
- [ ] CORS updated
- [ ] Health check passes: `curl https://your-api.up.railway.app/health`
- [ ] Website loads: `https://your-app.vercel.app`
- [ ] Login works
- [ ] Leaderboards display

## 🎯 What You Get

✅ **Automatic deployments** - Push to GitHub = auto-deploy
✅ **Free SSL certificates** - HTTPS enabled automatically
✅ **Built-in database** - PostgreSQL and Redis included
✅ **Zero configuration** - Works out of the box
✅ **$5 free credit** - Renews monthly
✅ **Monitoring included** - Logs and metrics built-in

## 💰 Cost

- **First month**: FREE ($5 credit)
- **Ongoing**: $0-5/month (depending on usage)
- **Database**: Included
- **SSL**: Included
- **Bandwidth**: Included

## 🆘 Troubleshooting

### Build Fails

```
Check Railway logs:
1. Click on your service
2. View "Deployments" tab
3. Click on failed deployment
4. Check build logs
```

### Database Connection Error

```
1. Verify DATABASE_URL is set to ${{Postgres.DATABASE_URL}}
2. Check PostgreSQL service is running
3. Run migrations: Railway Terminal → npx prisma migrate deploy
```

### CORS Error

```
1. Verify CORS_ORIGIN matches your Vercel URL exactly
2. Include https:// protocol
3. No trailing slash
```

### Frontend Can't Connect to Backend

```
1. Check NEXT_PUBLIC_API_URL is correct
2. Verify backend is deployed and running
3. Test backend health: curl https://your-api.up.railway.app/health
```

## 📞 Need Help?

- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Vercel Docs**: https://vercel.com/docs
- **Vercel Support**: https://vercel.com/support

## 🚀 Next Steps

1. **Add Custom Domain**:
   - Railway: Settings → Networking → Custom Domain
   - Vercel: Settings → Domains

2. **Set Up Monitoring**:
   - Railway: Built-in metrics
   - Vercel: Analytics tab

3. **Configure Backups**:
   - Set up database backups
   - Export data regularly

4. **Optimize Performance**:
   - Monitor usage in Railway
   - Check Vercel analytics

---

**Total Time**: 15 minutes
**Cost**: $0-5/month
**Difficulty**: ⭐ Easy

🎉 **Congratulations!** Your MattySpins website is now live!

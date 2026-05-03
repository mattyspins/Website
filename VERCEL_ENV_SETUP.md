# 🔷 Vercel Environment Variables Setup

Simple guide to configure environment variables in Vercel for your frontend.

## 📋 How to Add Variables in Vercel

### Method 1: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/dashboard
2. Select your project
3. Click **"Settings"** tab
4. Click **"Environment Variables"** in sidebar
5. Add each variable:
   - Enter **Key** (variable name)
   - Enter **Value**
   - Select environments: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Add environment variables
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_SOCKET_URL production
```

---

## 🔐 Environment Variables

### Required Variables

⚠️ **UPDATE THESE** with your Railway domain after backend deployment:

```
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

### Example with Real Domain

If your Railway domain is `mattyspins-api-production.up.railway.app`:

```
NEXT_PUBLIC_API_URL=https://mattyspins-api-production.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://mattyspins-api-production.up.railway.app
```

---

## 📝 Step-by-Step Instructions

### Step 1: Get Your Railway Domain

1. Go to Railway dashboard
2. Click on your backend service
3. Go to **"Settings"** → **"Domains"**
4. Copy the generated domain (e.g., `your-app.up.railway.app`)

### Step 2: Add Variables in Vercel

1. Go to Vercel project settings
2. Click **"Environment Variables"**
3. Add first variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://your-railway-domain.up.railway.app`
   - **Environments**: Select all three (Production, Preview, Development)
   - Click **"Save"**

4. Add second variable:
   - **Key**: `NEXT_PUBLIC_SOCKET_URL`
   - **Value**: `https://your-railway-domain.up.railway.app`
   - **Environments**: Select all three
   - Click **"Save"**

### Step 3: Redeploy

After adding variables, you MUST redeploy:

1. Go to **"Deployments"** tab
2. Click on the latest deployment
3. Click **"..."** menu → **"Redeploy"**
4. Confirm redeploy

---

## ✅ Verification

### Check Variables Are Set

1. In Vercel project, go to **"Settings"** → **"Environment Variables"**
2. You should see:
   ```
   NEXT_PUBLIC_API_URL
   NEXT_PUBLIC_SOCKET_URL
   ```
3. Both should have values for Production, Preview, and Development

### Test Frontend

1. Visit your Vercel domain: `https://your-project.vercel.app`
2. Open browser console (F12)
3. Check for API connection errors
4. Try logging in with Discord

### Test API Connection

Open browser console and run:

```javascript
console.log("API URL:", process.env.NEXT_PUBLIC_API_URL);
console.log("Socket URL:", process.env.NEXT_PUBLIC_SOCKET_URL);
```

Should show your Railway domain.

---

## 🎯 Environment-Specific Configuration

### Production

Used for your main deployment (`your-project.vercel.app`)

```
NEXT_PUBLIC_API_URL=https://your-railway-domain.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-domain.up.railway.app
```

### Preview

Used for pull request previews

```
NEXT_PUBLIC_API_URL=https://your-railway-domain.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://your-railway-domain.up.railway.app
```

### Development

Used for local development via `vercel dev`

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

---

## 🔧 Optional Variables

### Analytics (Optional)

If you want to add Google Analytics:

```
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

### Error Tracking (Optional)

If you want to add Sentry:

```
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
```

---

## ⚠️ Important Notes

### Variable Naming

- ✅ Must start with `NEXT_PUBLIC_` to be accessible in browser
- ✅ Use UPPERCASE with underscores
- ❌ Don't use spaces or special characters

### Security

- ✅ Only expose public variables (API URLs, public keys)
- ❌ Never expose secrets (API keys, tokens) in `NEXT_PUBLIC_` variables
- ✅ Backend secrets stay in Railway only

### Deployment

- ⚠️ Changes to environment variables require redeployment
- ⚠️ Variables are baked into the build at deploy time
- ⚠️ Changing variables won't affect existing deployments

---

## 🆘 Troubleshooting

### "API calls returning 404"

**Problem**: Frontend can't reach backend

**Solution**:

1. Check `NEXT_PUBLIC_API_URL` is set correctly
2. Verify Railway backend is running
3. Test backend directly: `curl https://your-railway-domain.up.railway.app/health`
4. Ensure no trailing slash in URL

### "CORS errors in console"

**Problem**: Backend rejecting frontend requests

**Solution**:

1. Go to Railway
2. Update `CORS_ORIGIN` to match your Vercel domain
3. Ensure it includes `https://` and no trailing slash
4. Wait for Railway to redeploy

### "Environment variables undefined"

**Problem**: Variables not loading in app

**Solution**:

1. Verify variables start with `NEXT_PUBLIC_`
2. Check they're set for correct environment
3. Redeploy after adding variables
4. Clear browser cache

### "Socket.IO not connecting"

**Problem**: WebSocket connection failing

**Solution**:

1. Verify `NEXT_PUBLIC_SOCKET_URL` matches Railway domain
2. Check Railway allows WebSocket connections (it does by default)
3. Check browser console for specific error
4. Ensure Railway backend is running

---

## 📋 Quick Reference

### Minimum Required Variables

```bash
NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
NEXT_PUBLIC_SOCKET_URL=https://YOUR-RAILWAY-DOMAIN.up.railway.app
```

### Where to Get Railway Domain

Railway Dashboard → Your Service → Settings → Domains → Copy

### When to Redeploy

- ✅ After adding new variables
- ✅ After changing variable values
- ✅ After updating Railway backend URL

### Testing Checklist

- [ ] Variables visible in Vercel settings
- [ ] Redeployed after adding variables
- [ ] Frontend loads without errors
- [ ] Browser console shows correct API URL
- [ ] API calls work (check Network tab)
- [ ] Authentication works

---

## 🎉 All Set!

Once variables are configured and redeployed:

1. Your frontend will connect to Railway backend
2. API calls will work
3. Authentication will function
4. Real-time features will connect

**Next**: Update Railway's `CORS_ORIGIN` with your Vercel domain!

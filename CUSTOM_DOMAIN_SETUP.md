# Custom Domain Setup Guide - mattyspins.com

## Overview

Setting up `mattyspins.com` as your custom domain for the Vercel frontend.

## Prerequisites

- ✅ Domain name: `mattyspins.com` (you need to own this domain)
- ✅ Access to domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
- ✅ Vercel account with deployed project

## Step 1: Add Domain to Vercel

### 1.1 Go to Vercel Dashboard

1. Visit https://vercel.com/dashboard
2. Select your project: `website-cyan-omega-40`
3. Go to **Settings** → **Domains**

### 1.2 Add Custom Domain

1. Click **Add Domain**
2. Enter: `mattyspins.com`
3. Click **Add**
4. Also add: `www.mattyspins.com` (recommended)

### 1.3 Vercel Will Show DNS Records

Vercel will provide DNS records you need to add. They typically look like:

**For mattyspins.com (A Record):**

```
Type: A
Name: @
Value: 76.76.21.21
```

**For www.mattyspins.com (CNAME):**

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

## Step 2: Configure DNS at Your Domain Registrar

### Option A: Using Cloudflare (Recommended)

If your domain is on Cloudflare:

1. **Go to Cloudflare Dashboard**
2. **Select your domain**: mattyspins.com
3. **Go to DNS** → **Records**
4. **Add A Record:**
   - Type: `A`
   - Name: `@`
   - IPv4 address: `76.76.21.21` (Vercel's IP)
   - Proxy status: DNS only (gray cloud) initially
   - TTL: Auto

5. **Add CNAME Record:**
   - Type: `CNAME`
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - Proxy status: DNS only (gray cloud) initially
   - TTL: Auto

6. **After verification, you can enable proxy (orange cloud)**

### Option B: Using GoDaddy

1. **Go to GoDaddy DNS Management**
2. **Find your domain**: mattyspins.com
3. **Click DNS** → **Manage DNS**
4. **Add A Record:**
   - Type: `A`
   - Host: `@`
   - Points to: `76.76.21.21`
   - TTL: 600 seconds

5. **Add CNAME Record:**
   - Type: `CNAME`
   - Host: `www`
   - Points to: `cname.vercel-dns.com`
   - TTL: 1 Hour

### Option C: Using Namecheap

1. **Go to Namecheap Dashboard**
2. **Select Domain List**
3. **Click Manage** next to mattyspins.com
4. **Go to Advanced DNS**
5. **Add A Record:**
   - Type: `A Record`
   - Host: `@`
   - Value: `76.76.21.21`
   - TTL: Automatic

6. **Add CNAME Record:**
   - Type: `CNAME Record`
   - Host: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: Automatic

## Step 3: Wait for DNS Propagation

- DNS changes can take **5 minutes to 48 hours** to propagate
- Usually takes **15-30 minutes**
- Check status at: https://dnschecker.org

## Step 4: Verify Domain in Vercel

1. **Go back to Vercel** → Settings → Domains
2. **Wait for verification** (Vercel checks DNS automatically)
3. **Status will change** from "Invalid Configuration" to "Valid Configuration"
4. **SSL Certificate** will be automatically provisioned (takes 1-2 minutes)

## Step 5: Update Backend CORS Configuration

Once the domain is working, update the backend to allow requests from the new domain.

### 5.1 Update Railway Environment Variables

In Railway Dashboard → Variables:

**Update CORS_ORIGIN:**

```
CORS_ORIGIN=https://mattyspins.com
```

**Or allow multiple domains (comma-separated):**

```
CORS_ORIGIN=https://mattyspins.com,https://www.mattyspins.com,https://website-cyan-omega-40.vercel.app
```

### 5.2 Redeploy Backend

Railway will automatically redeploy after changing environment variables.

## Step 6: Update Discord OAuth Redirect URI

### 6.1 Update Discord Developer Portal

1. Go to https://discord.com/developers/applications
2. Select your application (Client ID: `1497558767762669670`)
3. Go to **OAuth2** → **General**
4. Under **Redirects**, add:
   ```
   https://mattyspins.com/auth/callback
   ```
5. Keep the Railway URL as backup:
   ```
   https://website-production-ece1.up.railway.app/api/auth/discord/callback
   ```
6. Click **Save Changes**

### 6.2 Update Railway Environment Variable

In Railway Dashboard → Variables:

**Update DISCORD_REDIRECT_URI:**

```
DISCORD_REDIRECT_URI=https://website-production-ece1.up.railway.app/api/auth/discord/callback
```

Note: Keep using the Railway URL for the redirect, not the frontend domain.

## Step 7: Test Everything

### 7.1 Test Domain Access

```
https://mattyspins.com
https://www.mattyspins.com
```

Both should load your frontend.

### 7.2 Test Discord Login

1. Go to https://mattyspins.com
2. Click "Discord" login
3. Complete OAuth flow
4. Should successfully log in

### 7.3 Test API Calls

Open browser console and verify API calls to Railway backend are working.

## Troubleshooting

### Domain Not Working

**Check DNS:**

```bash
# Check A record
nslookup mattyspins.com

# Check CNAME
nslookup www.mattyspins.com
```

**Expected results:**

- `mattyspins.com` should point to `76.76.21.21`
- `www.mattyspins.com` should point to `cname.vercel-dns.com`

### SSL Certificate Issues

If you see "Not Secure" warning:

1. Wait 5-10 minutes for SSL provisioning
2. Check Vercel Dashboard → Domains for SSL status
3. Try accessing with `https://` explicitly

### CORS Errors

If you see CORS errors in browser console:

1. Verify CORS_ORIGIN in Railway includes your new domain
2. Check Railway Deploy Logs for CORS configuration
3. Clear browser cache and try again

### Discord Login Not Working

1. Verify Discord redirect URI includes your domain
2. Check Railway HTTP Logs for callback requests
3. Verify DISCORD_REDIRECT_URI in Railway is correct

## Domain Configuration Summary

### DNS Records to Add

| Type  | Name | Value                | TTL  |
| ----- | ---- | -------------------- | ---- |
| A     | @    | 76.76.21.21          | Auto |
| CNAME | www  | cname.vercel-dns.com | Auto |

### Vercel Configuration

- Primary domain: `mattyspins.com`
- Redirect: `www.mattyspins.com` → `mattyspins.com`
- SSL: Automatic (Let's Encrypt)
- HTTPS: Forced

### Railway Configuration

- CORS_ORIGIN: `https://mattyspins.com`
- DISCORD_REDIRECT_URI: `https://website-production-ece1.up.railway.app/api/auth/discord/callback`

## Additional Recommendations

### 1. Set Up Email Forwarding

Configure email forwarding for professional emails:

- `contact@mattyspins.com`
- `support@mattyspins.com`
- `admin@mattyspins.com`

### 2. Enable Cloudflare (Optional)

Benefits:

- DDoS protection
- CDN for faster loading
- Analytics
- Additional security features

### 3. Set Up Redirects

In Vercel, configure:

- `www.mattyspins.com` → `mattyspins.com` (already done by Vercel)
- Force HTTPS (already done by Vercel)

### 4. Monitor Domain

- Set up uptime monitoring (UptimeRobot, Pingdom)
- Monitor SSL certificate expiration (auto-renewed by Vercel)
- Check DNS health regularly

## Cost Considerations

### Domain Registration

- **Annual cost**: $10-15/year (varies by registrar)
- **Renewal**: Set up auto-renewal to avoid losing domain

### Vercel Hosting

- **Free tier**: Includes custom domains
- **SSL**: Free (Let's Encrypt)
- **Bandwidth**: 100GB/month on free tier

### Railway Hosting

- **Free tier**: $5 credit/month
- **Paid tier**: Pay as you go after free credit

## Timeline

1. **Purchase domain**: Immediate
2. **Add to Vercel**: 2 minutes
3. **Configure DNS**: 5 minutes
4. **DNS propagation**: 15-30 minutes (up to 48 hours)
5. **SSL provisioning**: 1-2 minutes after DNS verification
6. **Update backend**: 5 minutes
7. **Testing**: 10 minutes

**Total estimated time**: 1-2 hours (mostly waiting for DNS)

## Support Resources

- **Vercel Docs**: https://vercel.com/docs/concepts/projects/domains
- **DNS Checker**: https://dnschecker.org
- **SSL Checker**: https://www.sslshopper.com/ssl-checker.html
- **Vercel Support**: https://vercel.com/support

## Checklist

- [ ] Purchase domain `mattyspins.com`
- [ ] Add domain to Vercel
- [ ] Configure DNS A record
- [ ] Configure DNS CNAME record
- [ ] Wait for DNS propagation
- [ ] Verify domain in Vercel
- [ ] Check SSL certificate
- [ ] Update CORS_ORIGIN in Railway
- [ ] Update Discord OAuth redirect
- [ ] Test domain access
- [ ] Test Discord login
- [ ] Test all features
- [ ] Set up email forwarding (optional)
- [ ] Enable monitoring (optional)

---

**Once you've purchased the domain, follow these steps and let me know if you need help with any specific part!**

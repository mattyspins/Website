# 🚂 Railway Environment Variables Setup

Copy and paste these into Railway's Variables tab. Update the values marked with `⚠️ UPDATE`.

## 📋 How to Add Variables in Railway

1. Go to your Railway project
2. Click on your backend service
3. Click **"Variables"** tab
4. Click **"+ New Variable"**
5. Paste variable name and value
6. Click **"Add"**

Or use **"RAW Editor"** to paste all at once.

---

## 🔐 Environment Variables

### Application Settings

```
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
```

### Database (Auto-provided by Railway)

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
```

### JWT Configuration

```
JWT_SECRET=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
JWT_REFRESH_SECRET=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
```

### Encryption Keys

```
ENCRYPTION_KEY=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
ENCRYPTION_SALT=kick-oauth-encryption-salt-2024-secure
ENCRYPTION_IV=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
```

### Discord OAuth

```
DISCORD_CLIENT_ID=1497558767762669670
DISCORD_CLIENT_SECRET=X8IKNd_Kyb5suw9noL4DwY66jygNKC5O
```

⚠️ **UPDATE THIS** with your Railway domain:

```
DISCORD_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/discord/callback
```

### Discord Server Settings

```
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=1488596157616885954
DISCORD_INVITE_URL=https://discord.gg/n2gCDVwebw
DISCORD_BOT_TOKEN=your-discord-bot-token-if-needed
```

### Kick OAuth

```
KICK_API_BASE_URL=https://kick.com/api/v2
KICK_OAUTH_BASE_URL=https://kick.com/oauth2
KICK_CLIENT_ID=01KQ8BG75STSKGMNR3YEVD9JS5
KICK_CLIENT_SECRET=b1c8ac24b472003090ab7bbfdd25e1ea1bb42c5b4d7666f78d0a47ec1eb4ff5a
KICK_CHANNEL_NAME=mattyspins
```

⚠️ **UPDATE THIS** with your Railway domain:

```
KICK_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/kick/callback
```

### CORS Configuration

⚠️ **UPDATE THIS** after Vercel deployment:

```
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
```

### Rate Limiting

```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Points System

```
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5
```

### Admin Configuration

```
ADMIN_DISCORD_IDS=1435983820968169482,1419427173630214184
```

### Security

```
BCRYPT_ROUNDS=12
SESSION_SECRET=W7ADNG93LooAO8cB1e1MV0LDkY/lb2vq9egsxE7AI2M=
WEBHOOK_SECRET=mattyspins-webhook-secret-2024
```

---

## 📝 RAW Editor Format

If using Railway's RAW Editor, paste this (update marked values):

```env
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
JWT_REFRESH_SECRET=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
ENCRYPTION_KEY=PcfJ5QvtJyPhfdaFPiBEHAA06T3AOrcZsfkWdD9K2aE=
ENCRYPTION_SALT=kick-oauth-encryption-salt-2024-secure
ENCRYPTION_IV=BFSJxD/2inz+v3wDdEqai5YpZ4kF4bHzoqZvBBWPDcI=
DISCORD_CLIENT_ID=1497558767762669670
DISCORD_CLIENT_SECRET=X8IKNd_Kyb5suw9noL4DwY66jygNKC5O
DISCORD_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/discord/callback
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=1488596157616885954
DISCORD_INVITE_URL=https://discord.gg/n2gCDVwebw
DISCORD_BOT_TOKEN=your-discord-bot-token-if-needed
KICK_API_BASE_URL=https://kick.com/api/v2
KICK_OAUTH_BASE_URL=https://kick.com/oauth2
KICK_CLIENT_ID=01KQ8BG75STSKGMNR3YEVD9JS5
KICK_CLIENT_SECRET=b1c8ac24b472003090ab7bbfdd25e1ea1bb42c5b4d7666f78d0a47ec1eb4ff5a
KICK_REDIRECT_URI=https://YOUR-RAILWAY-DOMAIN.up.railway.app/api/auth/kick/callback
KICK_CHANNEL_NAME=mattyspins
CORS_ORIGIN=https://YOUR-VERCEL-DOMAIN.vercel.app
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5
ADMIN_DISCORD_IDS=1435983820968169482,1419427173630214184
BCRYPT_ROUNDS=12
SESSION_SECRET=W7ADNG93LooAO8cB1e1MV0LDkY/lb2vq9egsxE7AI2M=
WEBHOOK_SECRET=mattyspins-webhook-secret-2024
```

---

## ⚠️ Important Notes

### Variables to Update

1. **After Railway domain is generated:**
   - `DISCORD_REDIRECT_URI`
   - `KICK_REDIRECT_URI`

2. **After Vercel deployment:**
   - `CORS_ORIGIN`

3. **After Discord OAuth update:**
   - Verify `DISCORD_REDIRECT_URI` in Discord Developer Portal

### Security Best Practices

- ✅ Keep these secrets secure
- ✅ Never commit them to Git
- ✅ Rotate secrets periodically
- ✅ Use different secrets for production vs development

### Auto-Provided Variables

Railway automatically provides these when you add the services:

- `DATABASE_URL` - From PostgreSQL service
- `REDIS_URL` - From Redis service

Use the reference syntax: `${{Postgres.DATABASE_URL}}`

---

## 🔍 Verification

After adding all variables:

1. Check Railway logs for startup
2. Look for "Database connected" message
3. Look for "Redis connected" message
4. Test health endpoint: `https://YOUR-RAILWAY-DOMAIN.up.railway.app/health`

---

## 🆘 Troubleshooting

**"Missing required environment variable"**
→ Check spelling and ensure all variables are added

**"Database connection failed"**
→ Verify `DATABASE_URL=${{Postgres.DATABASE_URL}}` syntax

**"Redis connection failed"**
→ Verify `REDIS_URL=${{Redis.REDIS_URL}}` syntax

**"CORS error"**
→ Update `CORS_ORIGIN` after Vercel deployment

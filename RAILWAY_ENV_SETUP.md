# Railway Environment Variables Setup

Paste these into Railway's **Variables → RAW Editor** for the backend service.

---

## RAW Editor — copy everything below this line

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
DISCORD_REDIRECT_URI=https://website-production-ece1.up.railway.app/api/auth/discord/callback
DISCORD_REQUIRE_SERVER_MEMBERSHIP=true
DISCORD_GUILD_ID=1488596157616885954
DISCORD_INVITE_URL=https://discord.gg/n2gCDVwebw
DISCORD_BOT_TOKEN=your-discord-bot-token-if-needed
KICK_API_BASE_URL=https://kick.com/api/v2
KICK_OAUTH_BASE_URL=https://kick.com/oauth2
KICK_CLIENT_ID=01KQ8BG75STSKGMNR3YEVD9JS5
KICK_CLIENT_SECRET=b1c8ac24b472003090ab7bbfdd25e1ea1bb42c5b4d7666f78d0a47ec1eb4ff5a
KICK_REDIRECT_URI=https://website-production-ece1.up.railway.app/api/auth/kick/callback
KICK_CHANNEL_NAME=mattyspinsslots
KICK_CHATROOM_ID=86456563
CORS_ORIGIN=https://mattyspins.vercel.app
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

## After deploying to custom domain

Update these two variables on Railway:

```
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
```

And update these on Vercel:

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

(or keep it as `https://website-production-ece1.up.railway.app` if not using a custom backend domain)

# 🚀 Deployment Checklist

## Pre-Deployment Checks

### ✅ Code Quality

- [x] Removed all test files and mock data
- [x] Removed unused imports and code
- [x] All TypeScript errors resolved
- [x] No console.log statements in production code
- [x] Proper error handling implemented

### ✅ Security

- [x] Environment variables properly configured
- [x] Secrets not committed to Git
- [x] CORS configured correctly
- [x] Rate limiting enabled
- [x] Input validation on all endpoints
- [x] SQL injection prevention (using Prisma ORM)
- [x] XSS protection enabled
- [x] CSRF protection for OAuth

### ✅ Database

- [x] Migrations created and tested
- [x] Database indexes optimized
- [x] Backup strategy in place
- [x] Connection pooling configured

### ✅ Features Implemented

- [x] Discord OAuth authentication
- [x] Manual leaderboard system
  - [x] Create leaderboards
  - [x] Add wagers
  - [x] View rankings
  - [x] Real-time updates (Socket.IO)
  - [x] CSV export
  - [x] Automatic expiration
- [x] Admin dashboard
- [x] Coming soon pages (Bonus Hunt, Store, Raffles)
- [x] Background jobs (leaderboard expiration)

### ✅ Testing

- [x] Backend API endpoints tested
- [x] LeaderboardService unit tests passing (13/13)
- [x] Frontend pages load without errors
- [x] Real-time updates working
- [x] Authentication flow tested

---

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"
REDIS_URL="redis://host:6379"

# JWT Secrets (CHANGE THESE!)
JWT_SECRET="generate-new-secret-key-here"
JWT_REFRESH_SECRET="generate-new-refresh-secret-here"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Discord OAuth
DISCORD_CLIENT_ID="your-discord-client-id"
DISCORD_CLIENT_SECRET="your-discord-client-secret"
DISCORD_REDIRECT_URI="https://yourdomain.com/api/auth/discord/callback"

# Discord Server Verification (Optional)
DISCORD_REQUIRE_SERVER_MEMBERSHIP="true"
DISCORD_GUILD_ID="your-discord-server-id"
DISCORD_INVITE_URL="https://discord.gg/your-invite"

# Kick OAuth (for future use)
KICK_API_BASE_URL="https://kick.com/api/v2"
KICK_OAUTH_BASE_URL="https://kick.com/oauth2"
KICK_CLIENT_ID="your-kick-client-id"
KICK_CLIENT_SECRET="your-kick-client-secret"
KICK_REDIRECT_URI="https://yourdomain.com/api/auth/kick/callback"
KICK_CHANNEL_NAME="your-channel-name"

# Encryption
ENCRYPTION_SALT="generate-random-salt-32-chars"
ENCRYPTION_KEY="generate-random-key-32-chars"
ENCRYPTION_IV="generate-random-iv-16-chars"

# Server
PORT=3001
NODE_ENV="production"
CORS_ORIGIN="https://yourdomain.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Points
POINTS_PER_MINUTE_VIEWING=1
BONUS_POINTS_MULTIPLIER=1.5

# Admin
ADMIN_DISCORD_IDS="your-discord-user-id"

# Logging
LOG_LEVEL="info"
LOG_FILE="logs/app.log"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="generate-new-session-secret"

# Webhooks
WEBHOOK_SECRET="generate-webhook-secret"
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

---

## Deployment Steps

### 1. Database Setup

```bash
# Run migrations
cd backend
npm run db:migrate

# Verify database connection
npm run db:studio
```

### 2. Backend Deployment

#### Option A: Traditional Server (VPS/Dedicated)

```bash
# Build backend
cd backend
npm run build

# Start with PM2
pm2 start dist/index.js --name "streaming-backend"
pm2 save
pm2 startup
```

#### Option B: Docker

```bash
# Build and run
docker-compose up -d
```

#### Option C: Cloud Platform (Render/Railway/Heroku)

- Connect GitHub repository
- Set environment variables
- Deploy from main branch

### 3. Frontend Deployment

#### Option A: Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

#### Option B: Netlify

```bash
# Build
cd frontend
npm run build

# Deploy dist folder
netlify deploy --prod
```

#### Option C: Traditional Server

```bash
# Build
cd frontend
npm run build

# Serve with nginx or similar
```

### 4. Discord Application Setup

1. Go to https://discord.com/developers/applications
2. Select your application
3. Update OAuth2 redirect URI to production URL:
   - `https://yourdomain.com/api/auth/discord/callback`
4. Save changes

### 5. DNS Configuration

- Point domain to your server IP
- Configure SSL certificate (Let's Encrypt recommended)
- Set up CDN if needed (Cloudflare)

### 6. Post-Deployment Verification

- [ ] Website loads correctly
- [ ] Discord login works
- [ ] Admin can create leaderboards
- [ ] Real-time updates working
- [ ] Database connections stable
- [ ] Background jobs running
- [ ] Logs are being written
- [ ] Error monitoring active

---

## Monitoring & Maintenance

### Logging

- Backend logs: `backend/logs/`
- Check for errors regularly
- Set up log rotation

### Database Backups

```bash
# PostgreSQL backup
pg_dump -U postgres streaming_backend > backup_$(date +%Y%m%d).sql

# Automated backups (cron)
0 2 * * * pg_dump -U postgres streaming_backend > /backups/backup_$(date +\%Y\%m\%d).sql
```

### Monitoring Tools

- **Uptime**: UptimeRobot, Pingdom
- **Errors**: Sentry
- **Performance**: New Relic, DataDog
- **Logs**: Logtail, Papertrail

### Regular Maintenance

- [ ] Weekly database backups
- [ ] Monthly security updates
- [ ] Monitor disk space
- [ ] Review error logs
- [ ] Check API rate limits

---

## Rollback Plan

If deployment fails:

1. **Database**: Restore from backup

   ```bash
   psql -U postgres streaming_backend < backup_YYYYMMDD.sql
   ```

2. **Backend**: Revert to previous version

   ```bash
   git revert HEAD
   npm run build
   pm2 restart streaming-backend
   ```

3. **Frontend**: Rollback deployment
   ```bash
   vercel rollback
   ```

---

## Support & Documentation

### Important Files

- `DISCORD_SETUP_GUIDE.md` - Discord OAuth setup
- `SETUP_FOR_NEW_STREAMER.md` - Initial configuration
- `README.md` - Project overview

### Admin Access

1. Login with Discord
2. Get your Discord user ID
3. Add to `ADMIN_DISCORD_IDS` in backend .env
4. Restart backend server

### Creating First Leaderboard

1. Login as admin
2. Go to `/admin/leaderboards`
3. Click "Create New Leaderboard"
4. Fill in details and prizes
5. Start adding wagers!

---

## Security Best Practices

### Production Checklist

- [ ] Change all default secrets
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Configure CSP headers
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security audits
- [ ] Keep dependencies updated

### Secrets Management

- Never commit `.env` files
- Use environment variables
- Rotate secrets regularly
- Use secret management tools (AWS Secrets Manager, HashiCorp Vault)

---

## Performance Optimization

### Backend

- [x] Database indexes configured
- [x] Redis caching enabled
- [x] Connection pooling active
- [ ] CDN for static assets
- [ ] Gzip compression enabled

### Frontend

- [x] Code splitting (Next.js automatic)
- [x] Image optimization
- [ ] CDN for assets
- [ ] Browser caching configured

---

## Troubleshooting

### Common Issues

**Database Connection Failed**

- Check DATABASE_URL
- Verify database is running
- Check firewall rules

**Discord OAuth Error**

- Verify redirect URI matches exactly
- Check client ID and secret
- Ensure scopes are correct

**Real-time Updates Not Working**

- Check Socket.IO connection
- Verify CORS settings
- Check firewall for WebSocket

**Background Jobs Not Running**

- Check server logs
- Verify cron job is started
- Check for errors in job execution

---

## Success Criteria

✅ Website is live and accessible
✅ Users can login with Discord
✅ Admins can create and manage leaderboards
✅ Real-time updates are working
✅ Background jobs are running
✅ No critical errors in logs
✅ Performance is acceptable
✅ Security measures are in place

---

## Contact & Support

For issues or questions:

- Check documentation first
- Review error logs
- Contact development team

**Ready for deployment!** 🚀

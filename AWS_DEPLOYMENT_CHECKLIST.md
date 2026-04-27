# AWS Deployment Checklist

## Critical Changes Required Before Deployment

### 1. **Frontend - Replace Hardcoded Backend URLs**

All frontend files have hardcoded `http://localhost:3001` URLs that need to be replaced with environment variables.

**Solution:** Create a `frontend/.env.local` file with:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

**Files that need updating:**

- `frontend/components/AuthButtons.tsx` (4 instances)
- `frontend/components/admin/AdminUsers.tsx` (3 instances)
- `frontend/components/admin/AdminStats.tsx` (1 instance)
- `frontend/components/admin/AdminSchedule.tsx` (1 instance - commented)
- `frontend/components/admin/AdminRaffles.tsx` (3 instances)
- `frontend/app/raffle/page.tsx` (4 instances)
- `frontend/app/profile/page.tsx` (2 instances)
- `frontend/app/moderator/page.tsx` (5 instances)
- `frontend/app/admin/page.tsx` (1 instance)
- `frontend/app/admin/audit-logs/page.tsx` (2 instances)

**Replace all instances of:**

```typescript
"http://localhost:3001/api/...";
```

**With:**

```typescript
`${process.env.NEXT_PUBLIC_API_URL}/api/...`;
```

---

### 2. **Backend Environment Variables**

Update `backend/.env` for production:

```env
# Database - Use AWS RDS PostgreSQL
DATABASE_URL="postgresql://username:password@your-rds-endpoint:5432/database_name"

# Redis - Use AWS ElastiCache or skip for now
REDIS_URL="redis://your-elasticache-endpoint:6379"

# JWT Secrets - Generate new secure secrets
JWT_SECRET="generate-a-strong-random-secret-here"
JWT_REFRESH_SECRET="generate-another-strong-random-secret-here"
JWT_EXPIRES_IN="1h"
JWT_REFRESH_EXPIRES_IN="7d"

# Discord OAuth - Update redirect URI
DISCORD_CLIENT_ID="1496486663868645476"
DISCORD_CLIENT_SECRET="9GVioOtwb9gqocM9-TvF2GsNElyPJ0o1"
DISCORD_REDIRECT_URI="https://your-backend-domain.com/api/auth/discord/callback"
DISCORD_REQUIRE_SERVER_MEMBERSHIP="true"
DISCORD_GUILD_ID="1488596157616885954"
DISCORD_INVITE_URL="https://discord.gg/n2gCDVwebw"

# Admin Discord IDs
ADMIN_DISCORD_IDS="1419427173630214184"

# Server Configuration
PORT=3001
NODE_ENV="production"
CORS_ORIGIN="https://your-frontend-domain.com"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Kick Configuration
KICK_API_BASE_URL="https://kick.com/api/v2"
KICK_CHANNEL_NAME="mattyspinsslots"

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET="generate-a-strong-session-secret-here"
```

---

### 3. **Discord Application Settings**

Update Discord Developer Portal:

- **Redirect URIs:** Add `https://your-backend-domain.com/api/auth/discord/callback`
- Keep the localhost URL for local development

---

### 4. **Backend TypeScript Build Issues**

The current `tsconfig.json` has deprecated options that cause build failures on Render. For AWS deployment:

**Option A:** Use the current config and add `--skipLibCheck` flag to build command
**Option B:** Update `tsconfig.json` to use modern settings (but this may require code changes)

**Recommended:** Keep current config and update `package.json`:

```json
"scripts": {
  "build": "tsc --skipLibCheck"
}
```

---

### 5. **CORS Configuration**

Ensure backend allows requests from your frontend domain:

- Update `CORS_ORIGIN` in backend `.env`
- If using multiple domains (www and non-www), update CORS middleware to accept array

---

### 6. **Database Setup**

**AWS RDS PostgreSQL:**

1. Create RDS PostgreSQL instance
2. Note the endpoint, username, password
3. Update `DATABASE_URL` in backend `.env`
4. Run migrations: `npx prisma migrate deploy`
5. Seed database: `npm run seed` (if you have seed data)

---

### 7. **Redis Setup (Optional)**

**Options:**

- **AWS ElastiCache:** Create Redis cluster and update `REDIS_URL`
- **Skip Redis:** Remove Redis dependency from code (leaderboard will use database)
- **Upstash Redis:** Free tier available, easy setup

---

### 8. **Build Commands**

**Backend:**

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm start
```

**Frontend:**

```bash
npm install
npm run build
npm start
```

---

### 9. **Health Check Endpoints**

Backend already has: `GET /health`
Ensure AWS load balancer/health checks point to this endpoint.

---

### 10. **Environment-Specific Files**

Create separate environment files:

- `backend/.env.production` - Production settings
- `backend/.env.development` - Local development
- `frontend/.env.production` - Production API URL
- `frontend/.env.local` - Local development API URL

---

## AWS Deployment Architecture Options

### Option 1: AWS Elastic Beanstalk (Easiest)

- Deploy backend and frontend as separate applications
- Automatic scaling and load balancing
- Easy environment variable management

### Option 2: AWS EC2 + RDS

- More control, manual setup
- Install Node.js, PostgreSQL client
- Use PM2 or systemd for process management
- Setup Nginx as reverse proxy

### Option 3: AWS ECS (Docker)

- Containerize backend and frontend
- Use Docker Compose or separate containers
- Requires Docker knowledge

### Option 4: AWS Amplify (Frontend) + Lambda (Backend)

- Amplify for Next.js frontend
- API Gateway + Lambda for backend
- Serverless architecture

---

## Recommended Deployment Steps

1. **Create environment variable configuration file**
2. **Replace all hardcoded URLs in frontend**
3. **Set up AWS RDS PostgreSQL database**
4. **Deploy backend to AWS (EC2/Elastic Beanstalk)**
5. **Update Discord redirect URI**
6. **Deploy frontend to AWS (Amplify/S3+CloudFront)**
7. **Update backend CORS_ORIGIN**
8. **Test authentication flow**
9. **Run database migrations**
10. **Test all features**

---

## Security Checklist

- [ ] Generate new JWT secrets (don't use example values)
- [ ] Use HTTPS for both frontend and backend
- [ ] Enable AWS security groups (firewall rules)
- [ ] Restrict database access to backend only
- [ ] Enable AWS CloudWatch logging
- [ ] Set up AWS WAF (Web Application Firewall)
- [ ] Use AWS Secrets Manager for sensitive data
- [ ] Enable rate limiting
- [ ] Set secure cookie flags in production

---

## Cost Estimate (AWS Free Tier)

- **EC2 t2.micro:** Free for 12 months (backend)
- **RDS db.t3.micro:** Free for 12 months (PostgreSQL)
- **S3 + CloudFront:** Free tier available (frontend)
- **ElastiCache:** NOT free (skip for now)

**Alternative Free Option:**

- Use Render.com (free tier) for backend
- Use Vercel (free tier) for frontend
- Use Render PostgreSQL (free tier)
- Skip Redis

---

## Next Steps

Would you like me to:

1. Create a utility function to replace all hardcoded URLs?
2. Create environment variable files?
3. Update the code to use environment variables?
4. Create AWS deployment scripts?
5. Create Docker configuration for containerized deployment?

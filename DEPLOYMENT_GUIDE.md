# 🚀 Deployment Guide

This guide covers deploying the MattySpins streaming website with:

- **Backend**: AWS (EC2 + RDS PostgreSQL + Redis)
- **Frontend**: Vercel

## � Deployment Options

### 🆓 **Option 1: Free Tier Deployment (Recommended)**

- **Cost**: $0-3/month (first 12 months)
- **Services**: EC2 t2.micro + RDS db.t2.micro + Redis Cloud free
- **Guide**: See `AWS_FREE_TIER_DEPLOYMENT.md`
- **Script**: `backend/scripts/deploy-free-tier.sh`

### 💼 **Option 2: Standard Deployment**

- **Cost**: $25-40/month
- **Services**: EC2 t3.micro + RDS db.t3.micro + ElastiCache
- **Guide**: Continue with this document

## �📋 Prerequisites

### AWS Account Setup

- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured
- [ ] Domain name (optional but recommended)

### Vercel Account Setup

- [ ] Vercel account (free tier works)
- [ ] GitHub repository for the project

### Required Services

- [ ] PostgreSQL database (AWS RDS)
- [ ] Redis instance (AWS ElastiCache or Redis Cloud)
- [ ] Discord OAuth application
- [ ] Domain/subdomain for API

## 🗄️ Database Setup (AWS RDS)

### 1. Create PostgreSQL Database

```bash
# Using AWS CLI (or use AWS Console)
aws rds create-db-instance \
  --db-instance-identifier mattyspins-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20 \
  --storage-type gp2 \
  --vpc-security-group-ids sg-xxxxxxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --storage-encrypted \
  --publicly-accessible
```

### 2. Configure Security Group

- Allow inbound PostgreSQL (port 5432) from your EC2 security group
- Allow inbound from your local IP for initial setup

### 3. Get Database Connection Details

```
Host: mattyspins-db.xxxxxxxxx.region.rds.amazonaws.com
Port: 5432
Database: postgres
Username: postgres
Password: YOUR_SECURE_PASSWORD
```

## 🔴 Redis Setup (ElastiCache or Redis Cloud)

### Option A: AWS ElastiCache

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id mattyspins-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --security-group-ids sg-xxxxxxxxx
```

### Option B: Redis Cloud (Recommended for simplicity)

1. Go to https://redis.com/try-free/
2. Create free account (30MB free tier)
3. Create database
4. Get connection string: `redis://username:password@host:port`

## 🖥️ Backend Deployment (AWS EC2)

### 1. Launch EC2 Instance

```bash
# Launch Ubuntu 22.04 LTS instance
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address
```

### 2. Configure Security Group

Allow inbound traffic:

- SSH (22) from your IP
- HTTP (80) from anywhere (0.0.0.0/0)
- HTTPS (443) from anywhere (0.0.0.0/0)
- Custom TCP (3001) from anywhere (for API)

### 3. Connect and Setup Server

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install Git
sudo apt install git -y
```

### 4. Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/your-repo.git
cd your-repo/backend

# Install dependencies
npm install

# Build the application
npm run build

# Set up environment variables (see backend/.env.production)
sudo nano .env.production

# Run database migrations
npm run migrate:deploy

# Start with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

## 🌐 Frontend Deployment (Vercel)

### 1. Prepare Repository

- Push your code to GitHub
- Ensure `frontend/` directory contains your Next.js app

### 2. Deploy to Vercel

#### Option A: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow prompts:
# - Link to existing project or create new
# - Set build command: npm run build
# - Set output directory: .next
# - Set install command: npm install
```

#### Option B: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import from GitHub
4. Select your repository
5. Set root directory to `frontend`
6. Configure environment variables
7. Deploy

### 3. Configure Environment Variables in Vercel

```
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## 🔧 Configuration Files

### Backend Environment (.env.production)

```env
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/postgres

# Redis
REDIS_URL=redis://username:password@your-redis-host:port

# Security
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key-here

# Discord OAuth
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback

# CORS
CORS_ORIGIN=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## 🔒 SSL/HTTPS Setup

### 1. Domain Setup

- Point your domain/subdomain to EC2 public IP
- Example: `api.yourdomain.com` → EC2 IP

### 2. Nginx Configuration

```nginx
# /etc/nginx/sites-available/mattyspins-api
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoring & Maintenance

### PM2 Process Management

```bash
# View processes
pm2 list

# View logs
pm2 logs

# Restart application
pm2 restart all

# Monitor
pm2 monit
```

### Database Maintenance

```bash
# Connect to RDS
psql -h your-rds-endpoint -U postgres -d postgres

# Backup
pg_dump -h your-rds-endpoint -U postgres postgres > backup.sql

# Monitor connections
SELECT * FROM pg_stat_activity;
```

## 🚀 Deployment Checklist

### Pre-Deployment

- [ ] Database created and accessible
- [ ] Redis instance running
- [ ] Discord OAuth app configured
- [ ] Domain DNS configured
- [ ] SSL certificates ready

### Backend Deployment

- [ ] EC2 instance launched and configured
- [ ] Application deployed and running
- [ ] Environment variables set
- [ ] Database migrations run
- [ ] PM2 process manager configured
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed

### Frontend Deployment

- [ ] Vercel project created
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Custom domain configured (optional)

### Post-Deployment Testing

- [ ] API health check: `https://api.yourdomain.com/health`
- [ ] Frontend loads: `https://yourdomain.com`
- [ ] Authentication works
- [ ] Database operations work
- [ ] Real-time features (Socket.IO) work
- [ ] Admin panel accessible

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check security group rules
   - Verify connection string
   - Test with `psql` command

2. **Redis Connection Failed**
   - Check Redis URL format
   - Verify network access
   - Test with `redis-cli`

3. **CORS Errors**
   - Update CORS_ORIGIN in backend
   - Check API URL in frontend

4. **SSL Issues**
   - Verify domain DNS
   - Check Nginx configuration
   - Renew certificates if expired

## 💰 Cost Estimation (Monthly)

### AWS Costs (Minimal Setup)

- EC2 t3.micro: ~$8.50
- RDS db.t3.micro: ~$13.00
- ElastiCache t3.micro: ~$11.00
- Data transfer: ~$1-5
- **Total AWS: ~$33-38/month**

### Vercel Costs

- Hobby plan: Free (sufficient for most use cases)
- Pro plan: $20/month (if needed)

### Alternative (Budget Option)

- Use Redis Cloud free tier: Save ~$11/month
- Use smaller RDS instance during development
- **Total: ~$22-27/month**

## 📞 Support

If you encounter issues:

1. Check logs: `pm2 logs` (backend), Vercel dashboard (frontend)
2. Verify environment variables
3. Test API endpoints individually
4. Check database connectivity
5. Review security group settings

---

**Next Steps**: Follow the step-by-step deployment process starting with database setup.

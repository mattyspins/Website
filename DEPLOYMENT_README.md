# 🚀 MattySpins Deployment Guide

## Quick Start

This guide will help you deploy the MattySpins streaming website with:

- **Backend**: AWS EC2 + RDS PostgreSQL + Redis
- **Frontend**: Vercel

## 📁 Files Overview

- `DEPLOYMENT_GUIDE.md` - Comprehensive deployment instructions
- `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- `backend/ecosystem.config.js` - PM2 configuration
- `backend/.env.production.example` - Backend environment template
- `backend/scripts/deploy.sh` - Automated deployment script
- `backend/scripts/migrate.sh` - Database migration script
- `backend/scripts/health-check.sh` - Deployment verification
- `frontend/vercel.json` - Vercel configuration
- `frontend/.env.production.example` - Frontend environment template

## 🎯 Quick Deployment Steps

### 1. Prerequisites Setup (15 minutes)

```bash
# 1. Create AWS RDS PostgreSQL database
# 2. Set up Redis (Redis Cloud recommended)
# 3. Configure Discord OAuth app
# 4. Purchase/configure domain
```

### 2. Backend Deployment (30 minutes)

```bash
# 1. Launch EC2 instance (Ubuntu 22.04)
# 2. SSH into server
ssh -i your-key.pem ubuntu@your-ec2-ip

# 3. Run deployment script
wget https://raw.githubusercontent.com/yourusername/your-repo/main/backend/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh

# 4. Configure environment
cd /home/ubuntu/mattyspins/backend
cp .env.production.example .env.production
nano .env.production  # Fill in your values

# 5. Deploy application
npm run deploy
pm2 start ecosystem.config.js --env production
```

### 3. Frontend Deployment (10 minutes)

```bash
# Option A: Vercel CLI
cd frontend
npm i -g vercel
vercel

# Option B: Vercel Dashboard
# 1. Go to vercel.com/dashboard
# 2. Import from GitHub
# 3. Set root directory to 'frontend'
# 4. Add environment variables
```

### 4. SSL & Domain Setup (15 minutes)

```bash
# Update Nginx config with your domain
sudo nano /etc/nginx/sites-available/mattyspins-api

# Get SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test deployment
./scripts/health-check.sh https://api.yourdomain.com https://yourdomain.com
```

## 🔧 Environment Variables

### Backend (.env.production)

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/postgres
REDIS_URL=redis://username:password@your-redis-host:port
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
ENCRYPTION_KEY=your-32-character-encryption-key-here
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://yourdomain.com/auth/callback
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (Vercel Dashboard)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## 🧪 Testing Your Deployment

### Automated Health Check

```bash
# On your server
./scripts/health-check.sh https://api.yourdomain.com https://yourdomain.com
```

### Manual Testing

```bash
# API Health
curl https://api.yourdomain.com/health

# Leaderboards
curl https://api.yourdomain.com/api/manual-leaderboards

# Frontend
open https://yourdomain.com
```

### Feature Testing

- [ ] User registration/login
- [ ] Admin panel access
- [ ] Leaderboard creation/management
- [ ] Real-time updates
- [ ] Profile management

## 📊 Monitoring

### PM2 Commands

```bash
pm2 status                    # View process status
pm2 logs mattyspins-api      # View logs
pm2 restart mattyspins-api   # Restart app
pm2 monit                    # Real-time monitoring
```

### System Monitoring

```bash
# Resource usage
htop
df -h
free -h

# Nginx status
sudo systemctl status nginx

# SSL certificate expiry
sudo certbot certificates
```

## 🔄 Updates & Maintenance

### Deploying Updates

```bash
# On your server
cd /home/ubuntu/mattyspins
git pull origin main
cd backend
npm install
npm run build
pm2 restart mattyspins-api
```

### Database Migrations

```bash
cd /home/ubuntu/mattyspins/backend
./scripts/migrate.sh
```

### Backup Procedures

```bash
# Database backup
pg_dump -h your-rds-endpoint -U postgres postgres > backup-$(date +%Y%m%d).sql

# Application backup
tar -czf app-backup-$(date +%Y%m%d).tar.gz /home/ubuntu/mattyspins
```

## 💰 Cost Estimation

### AWS (Monthly)

- EC2 t3.micro: ~$8.50
- RDS db.t3.micro: ~$13.00
- Data transfer: ~$1-3
- **Total: ~$22-25/month**

### Vercel

- Hobby plan: Free
- Pro plan: $20/month (if needed)

### Redis Cloud

- Free tier: $0 (30MB)
- Paid plans: $5+/month

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**

```bash
# Test connection
psql -h your-rds-endpoint -U postgres
# Check security groups
# Verify connection string
```

**API Not Responding**

```bash
# Check PM2 status
pm2 status
pm2 logs mattyspins-api

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

**CORS Errors**

```bash
# Update CORS origin
nano .env.production
pm2 restart mattyspins-api
```

**SSL Issues**

```bash
# Check certificate
sudo certbot certificates
# Renew if needed
sudo certbot renew
```

## 📞 Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com/
- **Vercel Documentation**: https://vercel.com/docs
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Nginx Documentation**: https://nginx.org/en/docs/

## 🎉 Success Checklist

- [ ] API responding at https://api.yourdomain.com/health
- [ ] Frontend loading at https://yourdomain.com
- [ ] User authentication working
- [ ] Admin panel accessible
- [ ] Leaderboards functional
- [ ] Real-time updates working
- [ ] SSL certificates valid
- [ ] Monitoring set up

---

**Estimated Deployment Time**: 1-2 hours
**Estimated Monthly Cost**: $25-45
**Difficulty Level**: Intermediate

For detailed instructions, see `DEPLOYMENT_GUIDE.md` and `DEPLOYMENT_CHECKLIST.md`.

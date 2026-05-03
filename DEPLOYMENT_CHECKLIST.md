# 🚀 MattySpins Deployment Checklist

## Phase 1: Pre-Deployment Setup

### 🗄️ Database Setup (AWS RDS)

- [ ] Create AWS RDS PostgreSQL instance
  - Instance class: `db.t3.micro` (free tier eligible)
  - Engine: PostgreSQL 15.4+
  - Storage: 20GB GP2
  - Enable automated backups
- [ ] Configure security group for database
  - Allow PostgreSQL (5432) from EC2 security group
  - Allow from your IP for initial setup
- [ ] Note connection details:
  ```
  Host: your-db-instance.region.rds.amazonaws.com
  Port: 5432
  Database: postgres
  Username: postgres
  Password: [your-secure-password]
  ```

### 🔴 Redis Setup

**Option A: Redis Cloud (Recommended)**

- [ ] Sign up at https://redis.com/try-free/
- [ ] Create free database (30MB)
- [ ] Note connection string: `redis://username:password@host:port`

**Option B: AWS ElastiCache**

- [ ] Create ElastiCache Redis cluster
- [ ] Configure security group
- [ ] Note endpoint

### 🔐 Discord OAuth Setup

- [ ] Go to https://discord.com/developers/applications
- [ ] Create new application or use existing
- [ ] Go to OAuth2 settings
- [ ] Add redirect URI: `https://yourdomain.com/auth/callback`
- [ ] Note Client ID and Client Secret

### 🌐 Domain Setup

- [ ] Purchase domain (if needed)
- [ ] Plan subdomains:
  - `yourdomain.com` → Frontend (Vercel)
  - `api.yourdomain.com` → Backend (AWS)

## Phase 2: Backend Deployment (AWS EC2)

### 🖥️ EC2 Instance Setup

- [ ] Launch EC2 instance
  - AMI: Ubuntu 22.04 LTS
  - Instance type: `t3.micro` (free tier)
  - Key pair: Create or use existing
  - Storage: 8GB GP2 (default)
- [ ] Configure security group:
  - SSH (22) from your IP
  - HTTP (80) from anywhere
  - HTTPS (443) from anywhere
  - Custom TCP (3001) from anywhere (temporary)
- [ ] Note public IP address
- [ ] Update DNS: Point `api.yourdomain.com` to EC2 IP

### 📦 Server Setup

- [ ] Connect to EC2: `ssh -i your-key.pem ubuntu@your-ec2-ip`
- [ ] Run deployment script:
  ```bash
  # Upload your code to GitHub first
  wget https://raw.githubusercontent.com/yourusername/your-repo/main/backend/scripts/deploy.sh
  chmod +x deploy.sh
  ./deploy.sh
  ```

### ⚙️ Configuration

- [ ] Create `.env.production` file:
  ```bash
  cd /home/ubuntu/mattyspins/backend
  cp .env.production.example .env.production
  nano .env.production
  ```
- [ ] Fill in all environment variables:
  - Database URL (RDS connection string)
  - Redis URL
  - JWT Secret (generate 32+ character string)
  - Encryption key (32 characters)
  - Discord OAuth credentials
  - CORS origin (your frontend domain)

### 🔄 Application Deployment

- [ ] Build and start application:
  ```bash
  npm run build
  pm2 start ecosystem.config.js --env production
  pm2 save
  ```
- [ ] Test API health: `curl http://localhost:3001/health`

### 🌐 Nginx Configuration

- [ ] Update Nginx config with your domain:
  ```bash
  sudo nano /etc/nginx/sites-available/mattyspins-api
  # Change server_name to api.yourdomain.com
  sudo nginx -t
  sudo systemctl reload nginx
  ```

### 🔒 SSL Certificate

- [ ] Install Certbot:
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```
- [ ] Get SSL certificate:
  ```bash
  sudo certbot --nginx -d api.yourdomain.com
  ```
- [ ] Test auto-renewal:
  ```bash
  sudo certbot renew --dry-run
  ```

### ✅ Backend Testing

- [ ] Test API endpoints:
  - `https://api.yourdomain.com/health` → Should return OK
  - `https://api.yourdomain.com/api/manual-leaderboards` → Should return leaderboards
- [ ] Check PM2 status: `pm2 status`
- [ ] Check logs: `pm2 logs`

## Phase 3: Frontend Deployment (Vercel)

### 📁 Repository Setup

- [ ] Push code to GitHub (if not already done)
- [ ] Ensure `frontend/` directory structure is correct

### 🚀 Vercel Deployment

**Option A: Vercel CLI**

- [ ] Install Vercel CLI: `npm i -g vercel`
- [ ] Navigate to frontend: `cd frontend`
- [ ] Deploy: `vercel`
- [ ] Follow prompts and configure

**Option B: Vercel Dashboard**

- [ ] Go to https://vercel.com/dashboard
- [ ] Click "New Project"
- [ ] Import from GitHub
- [ ] Select repository
- [ ] Configure:
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `.next`
  - Install Command: `npm install`

### 🔧 Environment Variables (Vercel)

- [ ] In Vercel dashboard, go to Project Settings → Environment Variables
- [ ] Add variables:
  ```
  NEXT_PUBLIC_API_URL=https://api.yourdomain.com
  NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
  ```
- [ ] Redeploy after adding variables

### 🌐 Custom Domain (Optional)

- [ ] In Vercel dashboard, go to Project Settings → Domains
- [ ] Add custom domain: `yourdomain.com`
- [ ] Configure DNS as instructed by Vercel

### ✅ Frontend Testing

- [ ] Test website: `https://yourdomain.com`
- [ ] Test authentication flow
- [ ] Test API connectivity
- [ ] Test all major features

## Phase 4: Final Configuration & Testing

### 🔄 CORS Update

- [ ] Update backend CORS settings:
  ```bash
  # On EC2 server
  nano /home/ubuntu/mattyspins/backend/.env.production
  # Update CORS_ORIGIN=https://yourdomain.com
  pm2 restart mattyspins-api
  ```

### 🔐 Discord OAuth Update

- [ ] Update Discord OAuth redirect URI to production domain
- [ ] Test login flow

### 🧪 End-to-End Testing

- [ ] User registration/login
- [ ] Admin panel access
- [ ] Leaderboard creation
- [ ] Wager addition
- [ ] Real-time updates
- [ ] Profile management
- [ ] Schedule management

### 📊 Monitoring Setup

- [ ] Set up PM2 monitoring: `pm2 monit`
- [ ] Configure log rotation
- [ ] Set up basic monitoring/alerts (optional)

## Phase 5: Security & Optimization

### 🔒 Security Hardening

- [ ] Update all packages: `sudo apt update && sudo apt upgrade`
- [ ] Configure UFW firewall
- [ ] Remove temporary port 3001 from security group
- [ ] Review and rotate secrets if needed

### ⚡ Performance Optimization

- [ ] Enable Nginx gzip compression (already in config)
- [ ] Configure PM2 clustering if needed
- [ ] Set up database connection pooling
- [ ] Monitor resource usage

### 💾 Backup Strategy

- [ ] Configure RDS automated backups
- [ ] Set up application code backup
- [ ] Document recovery procedures

## 🎉 Go Live Checklist

### Final Verification

- [ ] All environment variables set correctly
- [ ] SSL certificates working
- [ ] All API endpoints responding
- [ ] Frontend loading correctly
- [ ] Authentication working
- [ ] Database operations working
- [ ] Real-time features working
- [ ] Admin panel accessible

### Documentation

- [ ] Update README with production URLs
- [ ] Document deployment process
- [ ] Create maintenance procedures
- [ ] Share admin credentials securely

### Communication

- [ ] Announce to users
- [ ] Update social media links
- [ ] Update Discord bot/webhooks if applicable

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check RDS security group
   - Verify connection string
   - Test with: `psql -h your-rds-endpoint -U postgres`

2. **Redis Connection Failed**
   - Verify Redis URL format
   - Check network connectivity
   - Test with: `redis-cli -u your-redis-url ping`

3. **CORS Errors**
   - Update CORS_ORIGIN in backend
   - Restart PM2: `pm2 restart all`

4. **SSL Certificate Issues**
   - Check domain DNS propagation
   - Verify Nginx configuration
   - Renew certificate: `sudo certbot renew`

5. **Build Failures**
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Check for TypeScript errors

### Emergency Contacts

- AWS Support: [Your support plan]
- Vercel Support: https://vercel.com/help
- Domain Registrar: [Your registrar support]

---

## 📞 Post-Deployment Support

After deployment, monitor:

- Server resources (CPU, memory, disk)
- Application logs
- Database performance
- User feedback

Regular maintenance:

- Update dependencies monthly
- Review security patches
- Monitor costs
- Backup verification

**Estimated Total Time: 4-6 hours**
**Estimated Monthly Cost: $25-40 (AWS) + $0-20 (Vercel)**

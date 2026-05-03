# 🆓 Free Tier Quick Start Guide

Deploy MattySpins for **$0/month** using AWS Free Tier + free services.

## ⚡ 30-Minute Deployment

### Step 1: Prerequisites (5 minutes)

```bash
# 1. Create AWS account (if needed)
# 2. Create Vercel account (if needed)
# 3. Set up Discord OAuth app
# 4. Get a domain (optional, can use Vercel subdomain)
```

### Step 2: Database Setup (5 minutes)

```bash
# Create RDS PostgreSQL (Free Tier)
aws rds create-db-instance \
  --db-instance-identifier mattyspins-free-db \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --master-username postgres \
  --master-user-password YourPassword123! \
  --allocated-storage 20 \
  --publicly-accessible
```

### Step 3: Redis Setup (2 minutes)

1. Go to https://redis.com/try-free/
2. Create account → Create database (30MB free)
3. Copy connection string

### Step 4: Backend Deployment (10 minutes)

```bash
# Launch EC2 t2.micro (Free Tier)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --key-name your-key

# SSH and deploy
ssh -i your-key.pem ubuntu@your-ec2-ip
wget https://raw.githubusercontent.com/yourusername/your-repo/main/backend/scripts/deploy-free-tier.sh
chmod +x deploy-free-tier.sh
./deploy-free-tier.sh

# Configure environment
cd /home/ubuntu/mattyspins/backend
cp .env.free-tier.example .env.production
nano .env.production  # Fill in your values

# Deploy
npm run migrate:deploy
pm2 start ecosystem.free-tier.js --env production
```

### Step 5: Frontend Deployment (5 minutes)

```bash
# Option A: Vercel CLI
cd frontend
npm i -g vercel
vercel

# Option B: Vercel Dashboard
# Import from GitHub, set root to 'frontend'
```

### Step 6: SSL & Testing (3 minutes)

```bash
# Get free SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test deployment
curl https://api.yourdomain.com/health
```

## 💰 Cost Breakdown

### Free Services Used

- ✅ **EC2 t2.micro**: 750 hours/month (FREE for 12 months)
- ✅ **RDS db.t2.micro**: 750 hours/month (FREE for 12 months)
- ✅ **EBS Storage**: 30GB (FREE for 12 months)
- ✅ **Redis Cloud**: 30MB (FREE forever)
- ✅ **Vercel**: Hobby plan (FREE forever)
- ✅ **Let's Encrypt SSL**: FREE forever

### Monthly Costs

- **Months 1-12**: $0
- **After 12 months**: ~$22/month

## 🔧 Environment Variables

### Backend (.env.production)

```env
DATABASE_URL=postgresql://postgres:password@your-rds-endpoint:5432/postgres
REDIS_URL=redis://default:password@your-redis-host:port
JWT_SECRET=your-32-character-secret
ENCRYPTION_KEY=your-32-character-key
DISCORD_CLIENT_ID=your-discord-id
DISCORD_CLIENT_SECRET=your-discord-secret
CORS_ORIGIN=https://yourdomain.vercel.app
```

### Frontend (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_SOCKET_URL=https://api.yourdomain.com
```

## 📊 Monitoring Free Tier Usage

```bash
# Check resource usage
./scripts/monitor-free-tier.sh

# AWS Billing Dashboard
# https://console.aws.amazon.com/billing/

# Set up billing alerts (recommended)
```

## 🚨 Free Tier Limits

### Stay Within Limits

- **EC2**: Don't exceed 750 hours/month (keep running 24/7 is OK)
- **RDS**: Don't exceed 750 hours/month (keep running 24/7 is OK)
- **Storage**: Stay under 30GB total
- **Data Transfer**: Monitor outbound traffic (15GB/month limit)

### Optimization Features

- Memory optimization (swap, limited heap)
- Automatic log rotation
- Gzip compression
- Rate limiting
- Weekly cleanup scripts

## 🎯 Perfect For

- **Development & Testing**
- **MVP Launches**
- **Small Communities** (< 1000 users)
- **Learning Projects**
- **Budget-Conscious Deployments**

## 🆘 Troubleshooting

### Common Issues

```bash
# Out of memory
./scripts/monitor-free-tier.sh  # Check usage
sudo swapon -s  # Verify swap is active

# Database connection failed
# Check RDS security group allows EC2 access

# High data transfer
# Monitor with: ./scripts/monitor-free-tier.sh
# Enable gzip compression (included in deployment)
```

### Support Resources

- AWS Free Tier FAQ: https://aws.amazon.com/free/
- Vercel Documentation: https://vercel.com/docs
- Redis Cloud Support: https://redis.com/company/support/

## 🎉 Success Checklist

- [ ] API responding: `curl https://api.yourdomain.com/health`
- [ ] Frontend loading: `https://yourdomain.vercel.app`
- [ ] Authentication working
- [ ] Leaderboards functional
- [ ] SSL certificate valid
- [ ] Billing alerts set up
- [ ] Resource monitoring active

---

**🎊 Congratulations!** You've deployed MattySpins for free!

**Next Steps:**

1. Test all features thoroughly
2. Set up monitoring and alerts
3. Plan for scaling when you outgrow free tier
4. Consider upgrading to paid tiers for production use

**Monthly Cost**: $0 (first year) → $22 (after free tier expires)

# 🆓 AWS Free Tier Deployment Guide - MattySpins

## 💰 Cost Optimization Strategy

This guide focuses on using **AWS Free Tier** and other free services to deploy MattySpins for **$0-5/month**.

### 🎯 Free Tier Services Used

- **EC2 t2.micro**: 750 hours/month (FREE for 12 months)
- **RDS db.t2.micro**: 750 hours/month (FREE for 12 months)
- **EBS Storage**: 30GB (FREE for 12 months)
- **Data Transfer**: 15GB/month outbound (FREE)
- **Redis Cloud**: 30MB (FREE forever)
- **Vercel**: Hobby plan (FREE forever)

### 💸 **Total Monthly Cost: $0-3**

- First 12 months: **$0** (if staying within free tier limits)
- After 12 months: **~$15-20/month**

## 🗄️ Database Setup (AWS RDS Free Tier)

### 1. Create Free Tier PostgreSQL Database

```bash
# Using AWS CLI with Free Tier specifications
aws rds create-db-instance \
  --db-instance-identifier mattyspins-free-db \
  --db-instance-class db.t2.micro \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password YourSecurePassword123! \
  --allocated-storage 20 \
  --storage-type gp2 \
  --no-multi-az \
  --no-storage-encrypted \
  --backup-retention-period 0 \
  --no-deletion-protection \
  --publicly-accessible \
  --vpc-security-group-ids sg-xxxxxxxxx
```

### 2. Free Tier Database Specifications

- **Instance Class**: `db.t2.micro` (1 vCPU, 1GB RAM)
- **Storage**: 20GB GP2 (within 30GB free tier)
- **Backup**: Disabled to save costs
- **Multi-AZ**: Disabled (not free)
- **Encryption**: Disabled (not free)

## 🔴 Redis Setup (Free Options)

### Option A: Redis Cloud (Recommended - FREE)

1. Go to https://redis.com/try-free/
2. Create account
3. Create database:
   - **Plan**: Fixed (FREE)
   - **Memory**: 30MB
   - **Region**: Choose closest to your EC2 region
4. Get connection string: `redis://default:password@host:port`

### Option B: Local Redis on EC2 (FREE but less reliable)

```bash
# Install Redis on EC2 (uses your free EC2 resources)
sudo apt update
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Configure Redis
sudo nano /etc/redis/redis.conf
# Set: bind 127.0.0.1
# Set: maxmemory 100mb
# Set: maxmemory-policy allkeys-lru

sudo systemctl restart redis-server
```

## 🖥️ Backend Deployment (EC2 Free Tier)

### 1. Launch Free Tier EC2 Instance

```bash
# Launch t2.micro instance (FREE for 12 months)
aws ec2 run-instances \
  --image-id ami-0c02fb55956c7d316 \
  --instance-type t2.micro \
  --key-name your-key-pair \
  --security-group-ids sg-xxxxxxxxx \
  --subnet-id subnet-xxxxxxxxx \
  --associate-public-ip-address \
  --block-device-mappings '[{
    "DeviceName": "/dev/sda1",
    "Ebs": {
      "VolumeSize": 8,
      "VolumeType": "gp2",
      "DeleteOnTermination": true
    }
  }]'
```

### 2. Free Tier EC2 Specifications

- **Instance Type**: `t2.micro` (1 vCPU, 1GB RAM)
- **Storage**: 8GB EBS (within 30GB free tier)
- **Operating System**: Ubuntu 22.04 LTS (free)
- **Data Transfer**: Monitor to stay under 15GB/month

### 3. Optimized Deployment Script

Let me create an optimized deployment script for free tier:

### 3. Optimized Deployment Script

Let me create an optimized deployment script for free tier:

```bash
# Connect to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Download and run free tier deployment script
wget https://raw.githubusercontent.com/yourusername/your-repo/main/backend/scripts/deploy-free-tier.sh
chmod +x deploy-free-tier.sh
./deploy-free-tier.sh
```

### 4. Configure Environment Variables

```bash
cd /home/ubuntu/mattyspins/backend
cp .env.free-tier.example .env.production
nano .env.production
```

Fill in your values:

```env
DATABASE_URL=postgresql://postgres:password@your-free-rds.region.rds.amazonaws.com:5432/postgres
REDIS_URL=redis://default:password@your-redis-cloud:port
JWT_SECRET=your-32-plus-character-secret
ENCRYPTION_KEY=your-32-character-key
DISCORD_CLIENT_ID=your-discord-id
DISCORD_CLIENT_SECRET=your-discord-secret
CORS_ORIGIN=https://yourdomain.vercel.app
```

### 5. Deploy and Start Application

```bash
# Run migrations
npm run migrate:deploy

# Start with free tier configuration
pm2 start ecosystem.free-tier.js --env production
pm2 save
```

## 📊 Free Tier Monitoring

### Monitor Usage

```bash
# Check system resources and free tier usage
./scripts/monitor-free-tier.sh

# View application status
pm2 status
pm2 logs mattyspins-api

# Check AWS usage at: https://console.aws.amazon.com/billing/
```

### Cost Optimization Features

- **Memory optimization**: Swap file, limited Node.js heap
- **Disk optimization**: Log rotation, automatic cleanup
- **Network optimization**: Gzip compression, rate limiting
- **Process optimization**: Single instance, fork mode

## 🔒 SSL Setup (Free with Let's Encrypt)

```bash
# Update Nginx config with your domain
sudo nano /etc/nginx/sites-available/mattyspins-api
# Change server_name to api.yourdomain.com

# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get free SSL certificate
sudo certbot --nginx -d api.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🧪 Testing Free Tier Deployment

```bash
# Run comprehensive health check
./scripts/monitor-free-tier.sh

# Test API endpoints
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/api/manual-leaderboards

# Monitor resource usage
htop
df -h
free -h
```

## 💰 Free Tier Cost Breakdown

### First 12 Months (FREE)

- EC2 t2.micro: 750 hours/month = **$0**
- RDS db.t2.micro: 750 hours/month = **$0**
- EBS Storage: 30GB = **$0**
- Data Transfer: 15GB/month = **$0**
- Redis Cloud: 30MB = **$0**
- Vercel: Hobby plan = **$0**
- **Total: $0/month**

### After 12 Months

- EC2 t2.micro: **~$8.50/month**
- RDS db.t2.micro: **~$12/month**
- Data Transfer: **~$1-3/month**
- Redis Cloud: **$0** (still free)
- Vercel: **$0** (still free)
- **Total: ~$21-24/month**

## ⚠️ Free Tier Limits to Monitor

### Critical Limits

- **EC2**: 750 hours/month (31 days × 24 hours = 744 hours)
- **RDS**: 750 hours/month
- **Storage**: 30GB total EBS storage
- **Data Transfer**: 15GB/month outbound

### Monitoring Commands

```bash
# Set up billing alerts in AWS Console
./scripts/monitor-free-tier.sh  # Run daily
# Check AWS Billing Dashboard regularly
```

## 🎯 Quick Free Tier Deployment Steps

1. **Create AWS RDS** (db.t2.micro, 20GB)
2. **Set up Redis Cloud** (free 30MB)
3. **Launch EC2** (t2.micro, 8GB)
4. **Run deployment script**
5. **Configure environment**
6. **Set up SSL certificate**
7. **Deploy frontend to Vercel**

**Total Time**: 30-45 minutes
**Cost**: $0 for first 12 months

---

This free tier deployment is perfect for:

- Development and testing
- Small-scale production (< 1000 users)
- Learning and experimentation
- MVP launches with minimal budget

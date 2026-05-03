#!/bin/bash

# MattySpins Free Tier Deployment Script
# Optimized for AWS Free Tier (t2.micro, minimal resources)

set -e

echo "🆓 Starting MattySpins Free Tier Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mattyspins-api"
APP_DIR="/home/ubuntu/mattyspins"
REPO_URL="https://github.com/yourusername/your-repo.git"  # Update this
BRANCH="main"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_free_tier() {
    echo -e "${BLUE}[FREE TIER]${NC} $1"
}

# Check if running as ubuntu user
if [ "$USER" != "ubuntu" ]; then
    print_error "This script should be run as the ubuntu user"
    exit 1
fi

print_free_tier "Deploying with AWS Free Tier optimizations..."

# Update system packages (minimal)
print_status "Updating system packages..."
sudo apt update
sudo apt upgrade -y --no-install-recommends

# Install Node.js 18 LTS (smaller footprint)
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js 18 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs --no-install-recommends
fi

# Install PM2 (lightweight process manager)
if ! command -v pm2 &> /dev/null; then
    print_status "Installing PM2..."
    sudo npm install -g pm2
fi

# Install Nginx (lightweight web server)
if ! command -v nginx &> /dev/null; then
    print_status "Installing Nginx..."
    sudo apt install nginx -y --no-install-recommends
fi

# Install Git
if ! command -v git &> /dev/null; then
    print_status "Installing Git..."
    sudo apt install git -y --no-install-recommends
fi

# Create application directory
print_status "Setting up application directory..."
sudo mkdir -p $APP_DIR
sudo chown ubuntu:ubuntu $APP_DIR

# Clone or update repository
if [ -d "$APP_DIR/.git" ]; then
    print_status "Updating existing repository..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
else
    print_status "Cloning repository..."
    git clone -b $BRANCH $REPO_URL $APP_DIR
    cd $APP_DIR
fi

# Navigate to backend directory
cd $APP_DIR/backend

# Install dependencies (production only to save space)
print_status "Installing production dependencies..."
npm ci --only=production --no-audit --no-fund

# Install TypeScript and build dependencies temporarily
print_status "Installing build dependencies..."
npm install --no-save typescript @types/node ts-node

# Build application
print_status "Building application..."
npm run build

# Remove build dependencies to save space
print_status "Cleaning up build dependencies..."
npm uninstall typescript @types/node ts-node
npm cache clean --force

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found!"
    print_warning "Creating template from example..."
    cp .env.production.example .env.production
    print_warning "Please edit .env.production with your configuration:"
    print_warning "nano .env.production"
    exit 1
fi

# Create logs directory
mkdir -p logs

# Configure swap file for t2.micro (1GB RAM is limited)
print_free_tier "Setting up swap file for memory optimization..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    print_status "1GB swap file created"
fi

# Optimize system for low memory
print_free_tier "Applying memory optimizations..."
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
echo 'vm.vfs_cache_pressure=50' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Stop existing PM2 process if running
print_status "Managing PM2 processes..."
pm2 delete $APP_NAME 2>/dev/null || true

# Create optimized PM2 ecosystem for free tier
cat > ecosystem.free-tier.js << EOF
module.exports = {
  apps: [
    {
      name: '$APP_NAME',
      script: 'dist/index.js',
      instances: 1,  // Single instance for t2.micro
      exec_mode: 'fork',  // Fork mode uses less memory than cluster
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Memory optimization
      max_memory_restart: '400M',  // Restart if using too much memory
      node_args: '--max-old-space-size=512',  // Limit Node.js memory
      
      // Logging (minimal)
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      
      // Auto restart
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10s',
      
      // Disable watch to save resources
      watch: false,
      
      // Health monitoring
      health_check_grace_period: 3000,
    },
  ],
};
EOF

# Start application with PM2
print_status "Starting application with PM2 (Free Tier config)..."
pm2 start ecosystem.free-tier.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Configure Nginx (optimized for free tier)
NGINX_CONFIG="/etc/nginx/sites-available/$APP_NAME"
if [ ! -f "$NGINX_CONFIG" ]; then
    print_status "Configuring Nginx (Free Tier optimized)..."
    
    # Create optimized Nginx configuration
    sudo tee $NGINX_CONFIG > /dev/null <<EOF
# Optimized for t2.micro (1GB RAM)
worker_processes 1;
worker_connections 512;

server {
    listen 80;
    server_name api.yourdomain.com;  # Update this with your domain

    # Basic security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression (save bandwidth)
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Rate limiting (protect free tier resources)
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/m;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeout settings (conservative for free tier)
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        
        # Buffer settings (memory optimization)
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }

    # Health check endpoint (no rate limiting)
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }

    # Block common attack patterns (save resources)
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF

    # Enable the site
    sudo ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/
    
    # Remove default site
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # Test Nginx configuration
    sudo nginx -t
    
    # Restart Nginx
    sudo systemctl restart nginx
    sudo systemctl enable nginx
fi

# Setup UFW firewall (basic protection)
print_status "Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup log rotation to save disk space
print_free_tier "Setting up log rotation..."
sudo tee /etc/logrotate.d/mattyspins > /dev/null <<EOF
/home/ubuntu/mattyspins/backend/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    copytruncate
}
EOF

# Setup automatic cleanup script
print_free_tier "Creating cleanup script..."
cat > /home/ubuntu/cleanup.sh << 'EOF'
#!/bin/bash
# Free Tier Maintenance Script

# Clean package cache
sudo apt autoremove -y
sudo apt autoclean

# Clean npm cache
npm cache clean --force

# Clean old logs (keep last 3 days)
find /home/ubuntu/mattyspins/backend/logs -name "*.log" -mtime +3 -delete

# Clean system logs
sudo journalctl --vacuum-time=3d

echo "Cleanup completed at $(date)"
EOF

chmod +x /home/ubuntu/cleanup.sh

# Setup weekly cleanup cron job
(crontab -l 2>/dev/null; echo "0 2 * * 0 /home/ubuntu/cleanup.sh >> /home/ubuntu/cleanup.log 2>&1") | crontab -

# Display status and free tier warnings
print_status "Free Tier Deployment completed!"

print_free_tier "Free Tier Monitoring:"
echo "Memory usage: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk usage: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 ")"}')"
echo "Swap usage: $(free -h | grep Swap | awk '{print $3 "/" $2}')"

print_status "Application status:"
pm2 status

print_warning "Free Tier Limits to Monitor:"
print_warning "• EC2: 750 hours/month (t2.micro)"
print_warning "• RDS: 750 hours/month (db.t2.micro)"
print_warning "• Storage: 30GB EBS total"
print_warning "• Data Transfer: 15GB/month outbound"
print_warning "• Monitor usage in AWS Billing Dashboard"

print_warning "Next steps:"
print_warning "1. Edit .env.production: nano .env.production"
print_warning "2. Run migrations: npm run migrate:deploy"
print_warning "3. Update domain in Nginx config"
print_warning "4. Install SSL: sudo certbot --nginx -d api.yourdomain.com"
print_warning "5. Test API: curl http://$(curl -s ifconfig.me)/health"

echo -e "${GREEN}✅ Free Tier deployment completed!${NC}"
echo -e "${BLUE}💰 Estimated cost: \$0-3/month${NC}"
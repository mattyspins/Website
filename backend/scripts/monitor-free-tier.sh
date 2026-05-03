#!/bin/bash

# AWS Free Tier Usage Monitor
# Run this script to check your free tier usage and avoid unexpected charges

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

echo "🆓 AWS Free Tier Usage Monitor"
echo "================================"

# Check system resources
print_header "System Resources (EC2 t2.micro)"

# Memory usage
MEM_TOTAL=$(free -m | grep Mem | awk '{print $2}')
MEM_USED=$(free -m | grep Mem | awk '{print $3}')
MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))

if [ $MEM_PERCENT -lt 70 ]; then
    print_success "Memory usage: ${MEM_USED}MB/${MEM_TOTAL}MB (${MEM_PERCENT}%)"
elif [ $MEM_PERCENT -lt 85 ]; then
    print_warning "Memory usage: ${MEM_USED}MB/${MEM_TOTAL}MB (${MEM_PERCENT}%)"
else
    print_error "Memory usage: ${MEM_USED}MB/${MEM_TOTAL}MB (${MEM_PERCENT}%) - HIGH!"
fi

# Disk usage
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
DISK_USED=$(df -h / | tail -1 | awk '{print $3}')
DISK_TOTAL=$(df -h / | tail -1 | awk '{print $2}')

if [ $DISK_USAGE -lt 60 ]; then
    print_success "Disk usage: ${DISK_USED}/${DISK_TOTAL} (${DISK_USAGE}%)"
elif [ $DISK_USAGE -lt 80 ]; then
    print_warning "Disk usage: ${DISK_USED}/${DISK_TOTAL} (${DISK_USAGE}%)"
else
    print_error "Disk usage: ${DISK_USED}/${DISK_TOTAL} (${DISK_USAGE}%) - HIGH!"
fi

# CPU load
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
print_info "CPU load average: $LOAD_AVG"

# Swap usage
SWAP_USED=$(free -m | grep Swap | awk '{print $3}')
SWAP_TOTAL=$(free -m | grep Swap | awk '{print $2}')
if [ $SWAP_TOTAL -gt 0 ]; then
    SWAP_PERCENT=$((SWAP_USED * 100 / SWAP_TOTAL))
    if [ $SWAP_PERCENT -lt 50 ]; then
        print_success "Swap usage: ${SWAP_USED}MB/${SWAP_TOTAL}MB (${SWAP_PERCENT}%)"
    else
        print_warning "Swap usage: ${SWAP_USED}MB/${SWAP_TOTAL}MB (${SWAP_PERCENT}%)"
    fi
else
    print_info "No swap configured"
fi

# Check application status
print_header "Application Status"

if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "mattyspins-api"; then
        APP_STATUS=$(pm2 list | grep mattyspins-api | awk '{print $10}')
        APP_MEMORY=$(pm2 list | grep mattyspins-api | awk '{print $8}')
        APP_CPU=$(pm2 list | grep mattyspins-api | awk '{print $9}')
        
        if [ "$APP_STATUS" = "online" ]; then
            print_success "Application: $APP_STATUS (Memory: $APP_MEMORY, CPU: $APP_CPU)"
        else
            print_error "Application: $APP_STATUS"
        fi
    else
        print_error "Application not found in PM2"
    fi
else
    print_warning "PM2 not installed"
fi

# Check Nginx status
if command -v nginx &> /dev/null; then
    if systemctl is-active --quiet nginx; then
        print_success "Nginx: Running"
    else
        print_error "Nginx: Not running"
    fi
else
    print_warning "Nginx not installed"
fi

# Check database connectivity
print_header "Database Connectivity"

if [ -f ".env.production" ]; then
    # Try to connect to database
    if command -v psql &> /dev/null; then
        # Extract database URL components
        DB_URL=$(grep DATABASE_URL .env.production | cut -d'=' -f2)
        if [ ! -z "$DB_URL" ]; then
            if psql "$DB_URL" -c "SELECT 1;" &>/dev/null; then
                print_success "Database connection: OK"
            else
                print_error "Database connection: Failed"
            fi
        else
            print_warning "DATABASE_URL not found in .env.production"
        fi
    else
        print_info "psql not installed - cannot test database connection"
    fi
else
    print_warning ".env.production not found"
fi

# Check Redis connectivity
print_header "Redis Connectivity"

if [ -f ".env.production" ]; then
    REDIS_URL=$(grep REDIS_URL .env.production | cut -d'=' -f2)
    if [ ! -z "$REDIS_URL" ]; then
        if command -v redis-cli &> /dev/null; then
            if redis-cli -u "$REDIS_URL" ping &>/dev/null; then
                print_success "Redis connection: OK"
            else
                print_error "Redis connection: Failed"
            fi
        else
            print_info "redis-cli not installed - cannot test Redis connection"
        fi
    else
        print_warning "REDIS_URL not found in .env.production"
    fi
fi

# Log file sizes
print_header "Log File Sizes"

if [ -d "logs" ]; then
    LOG_SIZE=$(du -sh logs 2>/dev/null | cut -f1)
    print_info "Application logs: $LOG_SIZE"
    
    # Check individual log files
    for log_file in logs/*.log; do
        if [ -f "$log_file" ]; then
            SIZE=$(du -sh "$log_file" | cut -f1)
            echo "  $(basename "$log_file"): $SIZE"
        fi
    done
else
    print_info "No logs directory found"
fi

# System logs
JOURNAL_SIZE=$(sudo journalctl --disk-usage 2>/dev/null | grep -o '[0-9.]*[KMGT]B' || echo "Unknown")
print_info "System logs (journalctl): $JOURNAL_SIZE"

# Network usage estimation
print_header "Network Usage Estimation"

# Get network interface stats
if [ -f /proc/net/dev ]; then
    # Get the main network interface (usually eth0 or ens5 on EC2)
    INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    if [ ! -z "$INTERFACE" ]; then
        RX_BYTES=$(cat /proc/net/dev | grep "$INTERFACE" | awk '{print $2}')
        TX_BYTES=$(cat /proc/net/dev | grep "$INTERFACE" | awk '{print $10}')
        
        # Convert to MB
        RX_MB=$((RX_BYTES / 1024 / 1024))
        TX_MB=$((TX_BYTES / 1024 / 1024))
        
        print_info "Network interface: $INTERFACE"
        print_info "Data received: ${RX_MB}MB"
        print_info "Data transmitted: ${TX_MB}MB"
        
        # Free tier allows 15GB outbound per month
        if [ $TX_MB -lt 10240 ]; then  # 10GB
            print_success "Outbound data usage looks good (${TX_MB}MB)"
        elif [ $TX_MB -lt 15360 ]; then  # 15GB
            print_warning "Outbound data usage: ${TX_MB}MB (approaching 15GB limit)"
        else
            print_error "Outbound data usage: ${TX_MB}MB (exceeds 15GB free tier limit!)"
        fi
    fi
fi

# Free Tier Reminders
print_header "Free Tier Limits & Reminders"

echo "📊 AWS Free Tier Limits (12 months):"
echo "   • EC2: 750 hours/month (t2.micro)"
echo "   • RDS: 750 hours/month (db.t2.micro)"
echo "   • EBS: 30GB storage"
echo "   • Data Transfer: 15GB/month outbound"
echo ""
echo "🔗 Monitor your usage:"
echo "   • AWS Billing Dashboard: https://console.aws.amazon.com/billing/"
echo "   • Set up billing alerts in AWS Console"
echo ""
echo "💡 Cost Optimization Tips:"
echo "   • Stop EC2 instance when not needed"
echo "   • Use Redis Cloud free tier (30MB)"
echo "   • Monitor data transfer usage"
echo "   • Clean up logs regularly"

# Cleanup recommendations
print_header "Cleanup Recommendations"

# Check for large files
echo "🧹 Large files (>10MB):"
find /home/ubuntu -type f -size +10M 2>/dev/null | head -5 | while read file; do
    SIZE=$(du -sh "$file" | cut -f1)
    echo "   $file ($SIZE)"
done

# Check npm cache
if [ -d ~/.npm ]; then
    NPM_CACHE_SIZE=$(du -sh ~/.npm 2>/dev/null | cut -f1)
    echo "📦 NPM cache size: $NPM_CACHE_SIZE"
    echo "   Clean with: npm cache clean --force"
fi

# Check apt cache
APT_CACHE_SIZE=$(du -sh /var/cache/apt 2>/dev/null | cut -f1)
echo "📦 APT cache size: $APT_CACHE_SIZE"
echo "   Clean with: sudo apt autoremove && sudo apt autoclean"

echo ""
echo "🔄 Run cleanup script: /home/ubuntu/cleanup.sh"
echo "⏰ Next automatic cleanup: $(crontab -l | grep cleanup.sh | awk '{print $1, $2, $3, $4, $5}')"

print_success "Free tier monitoring completed!"
echo "💰 Estimated monthly cost: \$0-3 (within free tier limits)"
#!/bin/bash

# Health Check Script for Production Deployment
# Use this to verify your deployment is working correctly

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Configuration
API_URL="${1:-http://localhost:3001}"
FRONTEND_URL="${2:-http://localhost:3000}"

echo "🔍 MattySpins Deployment Health Check"
echo "API URL: $API_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "----------------------------------------"

# Check API Health
print_info "Checking API health endpoint..."
if curl -s -f "$API_URL/health" > /dev/null; then
    HEALTH_RESPONSE=$(curl -s "$API_URL/health")
    print_success "API health check passed"
    echo "   Response: $HEALTH_RESPONSE"
else
    print_error "API health check failed"
    exit 1
fi

# Check API endpoints
print_info "Checking API endpoints..."

# Test leaderboards endpoint
if curl -s -f "$API_URL/api/manual-leaderboards" > /dev/null; then
    print_success "Leaderboards endpoint working"
else
    print_error "Leaderboards endpoint failed"
fi

# Check database connectivity (indirect)
print_info "Checking database connectivity..."
DB_RESPONSE=$(curl -s "$API_URL/api/manual-leaderboards" | grep -o '"success":[^,]*' || echo "")
if [[ $DB_RESPONSE == *"true"* ]]; then
    print_success "Database connectivity confirmed"
else
    print_warning "Database connectivity uncertain"
fi

# Check PM2 status (if running on server)
if command -v pm2 &> /dev/null; then
    print_info "Checking PM2 status..."
    if pm2 list | grep -q "mattyspins-api"; then
        print_success "PM2 process running"
        pm2 list | grep mattyspins-api
    else
        print_error "PM2 process not found"
    fi
fi

# Check Nginx status (if running on server)
if command -v nginx &> /dev/null; then
    print_info "Checking Nginx status..."
    if systemctl is-active --quiet nginx; then
        print_success "Nginx is running"
    else
        print_error "Nginx is not running"
    fi
fi

# Check SSL certificate (if HTTPS)
if [[ $API_URL == https* ]]; then
    print_info "Checking SSL certificate..."
    DOMAIN=$(echo $API_URL | sed 's|https://||' | sed 's|/.*||')
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        print_success "SSL certificate is valid"
        EXPIRY=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        echo "   Expires: $EXPIRY"
    else
        print_warning "SSL certificate check failed or not accessible"
    fi
fi

# Check frontend (if URL provided)
if [[ $FRONTEND_URL != "http://localhost:3000" ]]; then
    print_info "Checking frontend..."
    if curl -s -f "$FRONTEND_URL" > /dev/null; then
        print_success "Frontend is accessible"
    else
        print_error "Frontend is not accessible"
    fi
fi

# System resource check (if on server)
if [ -f "/proc/meminfo" ]; then
    print_info "System resources:"
    
    # Memory usage
    MEM_TOTAL=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_AVAILABLE=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEM_USED=$((MEM_TOTAL - MEM_AVAILABLE))
    MEM_PERCENT=$((MEM_USED * 100 / MEM_TOTAL))
    
    if [ $MEM_PERCENT -lt 80 ]; then
        print_success "Memory usage: ${MEM_PERCENT}%"
    else
        print_warning "Memory usage: ${MEM_PERCENT}% (high)"
    fi
    
    # Disk usage
    DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ $DISK_USAGE -lt 80 ]; then
        print_success "Disk usage: ${DISK_USAGE}%"
    else
        print_warning "Disk usage: ${DISK_USAGE}% (high)"
    fi
    
    # Load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    echo "   Load average: $LOAD_AVG"
fi

echo "----------------------------------------"
print_info "Health check completed!"

# Summary
echo ""
echo "📊 Quick Test Commands:"
echo "   API Health: curl $API_URL/health"
echo "   Leaderboards: curl $API_URL/api/manual-leaderboards"
if command -v pm2 &> /dev/null; then
    echo "   PM2 Status: pm2 status"
    echo "   View Logs: pm2 logs mattyspins-api"
fi

echo ""
echo "🔗 URLs:"
echo "   API: $API_URL"
echo "   Frontend: $FRONTEND_URL"
echo "   API Health: $API_URL/health"
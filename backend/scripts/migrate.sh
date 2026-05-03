#!/bin/bash

# Database Migration Script for Production
# Run this script to apply database migrations

set -e

echo "🗄️ Running database migrations..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.production exists
if [ ! -f ".env.production" ]; then
    print_error ".env.production file not found!"
    print_error "Please create the environment file first"
    exit 1
fi

# Load environment variables
export $(cat .env.production | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL not set in .env.production"
    exit 1
fi

print_status "Database URL: ${DATABASE_URL%@*}@***"

# Test database connection
print_status "Testing database connection..."
if ! npx prisma db execute --url="$DATABASE_URL" --stdin <<< "SELECT 1;"; then
    print_error "Failed to connect to database"
    exit 1
fi

print_status "Database connection successful!"

# Generate Prisma client
print_status "Generating Prisma client..."
npx prisma generate

# Run migrations
print_status "Applying database migrations..."
npx prisma migrate deploy

# Seed database (optional)
if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then
    read -p "Do you want to run database seeding? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Running database seed..."
        npm run seed
    fi
fi

print_status "✅ Database migrations completed successfully!"

# Show migration status
print_status "Current migration status:"
npx prisma migrate status
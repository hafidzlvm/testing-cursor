#!/bin/bash

# Database Setup Script for Omnichannel Backend
# This script helps you setup PostgreSQL database using Docker

set -e

echo "🚀 Omnichannel Database Setup"
echo "================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env file exists
if [ ! -f "../.env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found in parent directory${NC}"
    read -p "Do you want to create .env file with default values? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        cat > ../.env << EOF
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DATABASE_PATH=./data/omnichannel.db

# PostgreSQL Configuration (for Docker)
POSTGRES_USER=omnichannel
POSTGRES_PASSWORD=omnichannel123
POSTGRES_DB=omnichannel
POSTGRES_PORT=5432
POSTGRES_HOST=localhost

# WhatsApp Configuration
WHATSAPP_SESSION_PATH=./data/whatsapp-sessions

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Security
JWT_SECRET=your-secret-key-change-in-production
API_KEY=your-api-key-change-in-production

# pgAdmin Configuration
PGADMIN_EMAIL=admin@omnichannel.com
PGADMIN_PASSWORD=admin123
PGADMIN_PORT=5050
EOF
        echo -e "${GREEN}✅ Created .env file${NC}"
    fi
fi

# Check if containers are already running
if docker ps | grep -q "omnichannel-postgres"; then
    echo -e "${YELLOW}⚠️  Database containers are already running${NC}"
    read -p "Do you want to restart them? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Stopping existing containers..."
        docker-compose down
    else
        echo "Exiting..."
        exit 0
    fi
fi

# Start database
echo ""
echo "Starting PostgreSQL database..."
docker-compose up -d

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Check if database is healthy
if docker exec omnichannel-postgres pg_isready -U omnichannel &> /dev/null; then
    echo -e "${GREEN}✅ Database is ready!${NC}"
    echo ""
    echo "📊 Database Information:"
    echo "   Host: localhost"
    echo "   Port: 5432"
    echo "   Database: omnichannel"
    echo "   Username: omnichannel"
    echo "   Password: omnichannel123"
    echo ""
    echo "🌐 pgAdmin: http://localhost:5050"
    echo "   Email: admin@omnichannel.com"
    echo "   Password: admin123"
    echo ""
    echo -e "${GREEN}✅ Setup complete!${NC}"
    echo ""
    echo "Useful commands:"
    echo "  - View logs: docker-compose logs -f"
    echo "  - Stop database: docker-compose stop"
    echo "  - Connect to DB: docker exec -it omnichannel-postgres psql -U omnichannel -d omnichannel"
else
    echo -e "${RED}❌ Database failed to start. Check logs with: docker-compose logs${NC}"
    exit 1
fi


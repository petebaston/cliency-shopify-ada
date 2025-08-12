#!/bin/bash

echo "🚀 Building Discount Manager Pro for Production"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create .env file from .env.example"
    exit 1
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432; then
    echo -e "${RED}❌ Error: PostgreSQL is not running${NC}"
    echo "Please start PostgreSQL service"
    exit 1
fi

# Install server dependencies
echo -e "${YELLOW}📦 Installing server dependencies...${NC}"
npm install

# Install client dependencies  
echo -e "${YELLOW}📦 Installing client dependencies...${NC}"
cd client
npm install --legacy-peer-deps
cd ..

# Run database migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
npm run migrate

# Build client for production
echo -e "${YELLOW}🏗️ Building React app...${NC}"
cd client
npm run build
cd ..

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
npm test --passWithNoTests

# Create production directories
echo -e "${YELLOW}📁 Creating production directories...${NC}"
mkdir -p dist
mkdir -p dist/server
mkdir -p dist/client

# Copy server files
echo -e "${YELLOW}📋 Copying server files...${NC}"
cp -r server/* dist/server/
cp package.json dist/
cp package-lock.json dist/
cp .env.example dist/

# Copy client build
echo -e "${YELLOW}📋 Copying client build...${NC}"
cp -r client/build dist/client/

# Create start script
echo -e "${YELLOW}📝 Creating start script...${NC}"
cat > dist/start.sh << 'EOF'
#!/bin/bash
echo "Starting Discount Manager Pro..."
NODE_ENV=production node server/index.js
EOF
chmod +x dist/start.sh

# Create deployment README
echo -e "${YELLOW}📄 Creating deployment instructions...${NC}"
cat > dist/DEPLOYMENT.md << 'EOF'
# Deployment Instructions

## Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- Shopify Partner Account
- SSL Certificate

## Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in all required environment variables
3. Ensure DATABASE_URL points to production database

## Database Setup
```bash
psql -U postgres -c "CREATE DATABASE shopify_discount_manager_prod;"
npm run migrate
```

## Start Application
```bash
npm install --production
npm start
```

## Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name your-app-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Health Check
Visit: https://your-domain.com/api/health

## Support
Email: support@discountmanagerpro.com
EOF

# Create docker file
echo -e "${YELLOW}🐳 Creating Dockerfile...${NC}"
cat > dist/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 8080

ENV NODE_ENV=production

CMD ["node", "server/index.js"]
EOF

# Check for any security issues
echo -e "${YELLOW}🔒 Checking for security vulnerabilities...${NC}"
npm audit --production

# Create production package.json
echo -e "${YELLOW}📦 Optimizing package.json for production...${NC}"
cd dist
npm prune --production
cd ..

# Calculate build size
SIZE=$(du -sh dist | cut -f1)
echo ""
echo -e "${GREEN}✅ Production build complete!${NC}"
echo "=============================================="
echo -e "Build size: ${YELLOW}${SIZE}${NC}"
echo -e "Output directory: ${YELLOW}dist/${NC}"
echo ""
echo "Next steps:"
echo "1. Review DEPLOYMENT.md in dist/ folder"
echo "2. Set up production environment variables"
echo "3. Deploy to your hosting provider"
echo "4. Configure Shopify app URLs in Partner Dashboard"
echo "5. Submit app for review"
echo ""
echo -e "${GREEN}🎉 Good luck with your app launch!${NC}"
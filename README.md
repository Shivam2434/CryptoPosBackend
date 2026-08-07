cat > README.md << 'EOF'
# CryptoPOS Backend 🚀

NestJS REST API + WebSocket server powering the CryptoPOS platform. Handles merchants, payments, blockchain monitoring, and settlements.

## 🎯 Features

- 🔐 JWT authentication for merchants
- 💳 Payment creation & lifecycle management
- ⛓️ Blockchain transaction monitoring (BTC, ETH, ERC-20)
- 💱 Live crypto price feeds (CoinGecko)
- 🔴 Real-time payment updates via Socket.io
- 📊 Analytics endpoints
- 🇦🇺 AUD settlement support
- 🛡️ AUSTRAC-compliant audit trail

## 🏗️ Tech Stack

- **Framework**: NestJS 10
- **Database**: PostgreSQL 16 + TypeORM
- **Auth**: JWT + Passport
- **WebSocket**: Socket.io
- **Blockchain**: ethers.js, Blockstream API
- **Validation**: class-validator + class-transformer
- **Documentation**: Swagger/OpenAPI
- **Language**: TypeScript

## 📁 Project Structure

\`\`\`
backend/
├── src/
│   ├── main.ts                       # App bootstrap
│   ├── app.module.ts                 # Root module
│   ├── config/                       # Configuration
│   ├── common/                       # Filters, guards, decorators
│   └── modules/
│       ├── auth/                     # Authentication
│       ├── merchants/                # Merchant management
│       ├── payments/                 # Payment lifecycle
│       ├── blockchain/               # BTC/ETH monitoring
│       ├── pricing/                  # Exchange rates
│       ├── settlements/              # AUD conversion
│       └── analytics/                # Dashboard data
├── test/                             # E2E tests
├── docker-compose.yml                # Local dev DB
└── nest-cli.json
\`\`\`

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16+
- Docker (optional, for local DB)

### Installation

\`\`\`bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/crypto-pos-backend.git
cd crypto-pos-backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials and API keys
\`\`\`

### Database Setup

**Option 1: Docker (recommended for dev)**
\`\`\`bash
docker-compose up -d postgres
\`\`\`

**Option 2: Local PostgreSQL**
\`\`\`bash
createdb crypto_pos
\`\`\`

### Environment Variables

See \`.env.example\` for full list. Required:

\`\`\`env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=crypto_pos

# JWT (generate a strong secret!)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h

# Blockchain APIs
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ETH_API_KEY=YOUR_ETHERSCAN_KEY
BTC_API_URL=https://blockstream.info/api

# CORS
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:3001
\`\`\`

### Running the Server

\`\`\`bash
# Development (with hot reload)
npm run start:dev

# Debug mode
npm run start:debug

# Production
npm run start:prod
\`\`\`

Server runs at:
- **API**: http://localhost:3000/api/v1
- **Swagger docs**: http://localhost:3000/api/docs
- **WebSocket**: ws://localhost:3000/payments

## 📖 API Documentation

Once running, visit **http://localhost:3000/api/docs** for interactive Swagger UI.

### Key Endpoints

\`\`\`
POST   /api/v1/auth/register              # Register merchant
POST   /api/v1/auth/login                 # Login

GET    /api/v1/merchants/profile          # Get profile
PUT    /api/v1/merchants/profile          # Update profile

POST   /api/v1/payments                   # Create payment
GET    /api/v1/payments                   # List payments (paginated)
GET    /api/v1/payments/:id               # Get single payment
GET    /api/v1/payments/:id/status        # Payment status only

GET    /api/v1/analytics/dashboard        # Dashboard stats
\`\`\`

## 🧪 Testing

\`\`\`bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage
npm run test:cov
\`\`\`

## 🐳 Docker

\`\`\`bash
# Build image
docker build -t crypto-pos-backend .

# Run with docker-compose
docker-compose up -d
\`\`\`

## 🚀 Deployment

### AWS ECS Fargate

See \`docs/deployment.md\` for AWS deployment guide.

### Environment Setup Checklist

- [ ] PostgreSQL RDS instance
- [ ] JWT secret in AWS Secrets Manager
- [ ] Alchemy/Infura API keys for Ethereum
- [ ] SSL certificate (ACM)
- [ ] Application Load Balancer
- [ ] CloudWatch logging

## 🔗 Related Repositories

- **Mobile App**: [crypto-pos-mobile](https://github.com/YOUR_USERNAME/crypto-pos-mobile)
- **Web Dashboard**: [crypto-pos-web](https://github.com/YOUR_USERNAME/crypto-pos-web) (coming soon)

## 📝 License

Private — All rights reserved

## 👤 Author

Shivam Sharma
EOF

echo "✅ Backend README created"
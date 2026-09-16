# CryptoPOS Backend 🚀

Enterprise-grade NestJS REST API + WebSocket server powering the CryptoPOS multi-tenant payments platform. Designed for Australian merchants, point-of-sale terminals, and e-commerce integrations.

---

## 🎯 Features

- 🔐 **Third-Party IdP Auth**: Vendor-agnostic OIDC/JWKS authentication (Auth0, AWS Cognito, Clerk, Supabase, Mock).
- 💳 **External Wallet First MVP**: Self-custody receiving address validation (BTC, ETH, USDT, USDC) directly paying merchant wallets with zero platform custody or private key handling.
- 🏢 **Multi-Tenant Hierarchy**: Organization (Tenant) ➔ Users & RBAC (`owner`, `admin`, `manager`, `cashier`) ➔ Merchants ➔ Locations ➔ Devices.
- ⛓️ **Blockchain Monitoring**: Distributed, restart-safe transaction detection & confirmation tracking for Bitcoin and Ethereum (Native & ERC-20).
- 💱 **Live AUD Pricing**: CoinGecko exchange rate polling with 30-second proactive cache and slippage buffer.
- 🔴 **Real-Time WebSockets**: Socket.io channels for instant POS terminal screen updates (`payment_<id>`) and live store feeds (`org_<id>`).
- 🔑 **Developer API Keys & Webhooks**: Scoped hashed API keys (`pk_live_`, `sk_live_`) and HMAC-signed webhook delivery with exponential backoff.
- 🛡️ **AUSTRAC Audit Trail**: Comprehensive audit logging for security, compliance, and wallet address changes.
- 🧪 **Sandbox Simulation**: Built-in test harness for simulating blockchain payments in development and QA.

---

## 🏗️ Tech Stack

- **Framework**: NestJS 11
- **Language**: TypeScript 5.7 (Strict Mode)
- **Database**: PostgreSQL 16 + TypeORM 0.3
- **Authentication**: OIDC / JWKS (Native Node.js `crypto`) + RBAC
- **Blockchain**: `ethers.js` v6, `bitcoinjs-lib` v7, Blockstream REST API
- **WebSockets**: Socket.io
- **Documentation**: Swagger / OpenAPI 2.0 (`/api/docs`)

---

## 📁 Project Structure

```
backend/
├── src/
│   ├── main.ts                       # App bootstrap & Swagger initialization
│   ├── app.module.ts                 # Root application module
│   ├── config/                       # App, auth, blockchain, pricing configs
│   ├── common/                       # Guards, filters, decorators, interceptors
│   ├── migrations/                   # PostgreSQL TypeORM migrations
│   └── modules/
│       ├── auth/                     # IdP token verification & profile sync
│       ├── users/                    # Team management & RBAC roles
│       ├── wallets/                  # External receiving addresses & validation
│       ├── organizations/            # Tenant onboarding & settings
│       ├── merchants/                # Business profiles, ABN, banking
│       ├── locations/                # Store locations & sales channels
│       ├── devices/                  # POS register pairing & tokens
│       ├── api-keys/                 # Live/Test scoped developer keys
│       ├── payments/                 # Idempotent payments, QR, addresses
│       ├── blockchain/               # Stateless blockchain monitor
│       ├── pricing/                  # Live exchange rate cache
│       ├── webhooks/                 # Signed webhook dispatcher & retries
│       ├── settlements/              # AUD batch payout abstraction
│       ├── sandbox/                  # Test payment simulator
│       └── analytics/                # Multi-tenant dashboard metrics
├── test/                             # Unit & E2E tests
└── nest-cli.json
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ LTS
- PostgreSQL 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/crypto-pos-backend.git
cd crypto-pos-backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
```

### Running the Server

```bash
# Development (with hot reload)
npm run start:dev

# Run unit tests
npm run test

# Production build
npm run build
npm run start:prod
```

Server endpoints:
- **API Base**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/api/docs`
- **WebSocket Gateway**: `ws://localhost:3000/payments`

---

## 🔒 Security & Custody Boundary

CryptoPOS operates strictly as a payment gateway and orchestration layer for the MVP:
- **CryptoPOS Stores**: Public receiving address, target network, asset type, friendly label.
- **CryptoPOS NEVER Stores**: Private keys, seed phrases, or wallet credentials.
- **Merchant Controls**: Private keys, seed phrases, and direct self-custody receipt of all customer funds.

---

## 💬 Contact & Support

- **Email**: `hey@sharmashivam.com`
- **Location**: Melbourne, Australia
- **Documentation**: [CryptoPOS Handover Guide](file:///Users/shivamsharma/Downloads/Projects/crypto_pos/backend/PROJECT_STATE.md)
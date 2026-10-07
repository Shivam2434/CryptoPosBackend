# CryptoPOS Backend 🚀

Enterprise-grade NestJS REST API + WebSocket server powering the CryptoPOS multi-tenant cryptocurrency payments platform. Designed for Australian merchants, point-of-sale terminals, and e-commerce integrations with Clerk/OIDC authentication.

---

## 🎯 Features

- 🔐 **Clerk & Third-Party IdP Auth**: Cryptographic RS256 JWKS token verification for Clerk and OIDC providers with automatic user & tenant provisioning.
- 💳 **Self-Custody Receiving MVP**: Direct payment receipt into merchant-controlled wallet addresses (BTC, ETH, USDT, USDC) with zero platform custody or private key storage.
- 🏢 **Multi-Tenant Hierarchy**: Organization (Tenant) ➔ Users & RBAC (`owner`, `admin`, `manager`, `cashier`, `super_admin`, `sub_admin`) ➔ Merchants ➔ Locations ➔ Devices.
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
- **Authentication**: Clerk / OIDC / JWKS (Native Node.js `crypto` RS256) + RBAC
- **Blockchain**: `ethers.js` v6, `bitcoinjs-lib` v7, Blockstream REST API
- **WebSockets**: Socket.io
- **Documentation**: Swagger / OpenAPI 2.0 (`/api/docs`)

---

## 🔐 Authentication vs Authorization Boundary

| Responsibility | Authority | Mechanism |
|---|---|---|
| User Authentication | **Clerk** (IdP) | Sign-in, sign-up, password handling, email OTP verification, session JWTs |
| Session Token Verification | **CryptoPOS Backend** | Cryptographic verification via Clerk's JWKS endpoint (`/.well-known/jwks.json`) |
| User Provisioning & Sync | **CryptoPOS Backend** | Idempotent sync on `POST /api/v1/auth/sync` |
| Tenant & Merchant Context | **CryptoPOS Backend** | Organization isolation, merchant mapping, device pairing |
| Role & Permission Enforcement | **CryptoPOS Backend** | `JwtAuthGuard`, `RolesGuard`, `PermissionsGuard`, `ScopeGuard` |
| Super & Sub Admin Access | **CryptoPOS Backend** | Invite-only platform admin scoping |

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
│       ├── auth/                     # Clerk/OIDC adapter, token verification & profile sync
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

## 🚀 Environment Variables

Copy `.env.example` to `.env`:

```env
# ── Identity Provider (Clerk) ────────────────
AUTH_PROVIDER=clerk
AUTH_ISSUER_URL=https://distinct-porpoise-1594.clerk.accounts.dev
AUTH_JWKS_URI=https://distinct-porpoise-1594.clerk.accounts.dev/.well-known/jwks.json
# Optional: Server-side Clerk API Key (do not commit)
# CLERK_SECRET_KEY=sk_test_...

# ── App & Database ───────────────────────────
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=cryptopos
DB_PASSWORD=cryptopos_password
DB_NAME=crypto_pos

# ── JWT (Legacy / fallback internal) ─────────
JWT_SECRET=crypto-pos-dev-secret-change-in-production-min-32-chars
JWT_EXPIRES_IN=24h
```

---

## 🧪 Testing & Build

```bash
# Run unit tests
npm run test

# Run code linter
npm run lint

# Build production bundle
npm run build

# Start production server
npm run start:prod
```

Server endpoints:
- **API Base**: `http://localhost:3000/api/v1`
- **Swagger Docs**: `http://localhost:3000/api/docs`
- **WebSocket Gateway**: `ws://localhost:3000/payments`

---

## 🔒 Security & Custody Boundary

CryptoPOS operates strictly as a payment gateway and orchestration layer:
- **CryptoPOS Stores**: Public receiving address, target network, asset type, friendly label.
- **CryptoPOS NEVER Stores**: Passwords (handled by Clerk), private keys, seed phrases, or wallet credentials.
- **Merchant Controls**: Private keys, seed phrases, and direct self-custody receipt of all customer funds.

---

## 💬 Contact & Support

- **Email**: `hey@sharmashivam.com`
- **Location**: Melbourne, Australia
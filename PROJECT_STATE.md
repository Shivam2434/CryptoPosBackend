# 🚀 CryptoPOS Multi-Tenant Platform — Project State & Handover Guide

> **Purpose**: This document provides a complete technical handover of the refactored CryptoPOS multi-tenant crypto payment platform. It outlines the architecture, tech stack, implemented modules, database entities, Third-Party Identity Provider authentication, RBAC system, API endpoints, migration plan, security models, and verification steps.

---

## 📌 1. Platform Overview & Hierarchy

CryptoPOS is an enterprise-grade multi-tenant crypto payments platform designed for Australian businesses, omni-channel retail stores, and e-commerce integrations.

### Tenant, User & Entity Hierarchy:
```
Organization (Tenant)
  ├── Users (Team members authenticated via Third-Party IdP: Auth0, Cognito, Clerk, Supabase, OIDC)
  │     └── Roles: owner, admin, manager, cashier
  ├── Merchants (Business profiles, AUSTRAC ABN, banking details, static wallets)
  ├── Locations (Physical stores, pop-ups, online checkouts)
  │     └── Devices (POS registers, Sunmi/iPad terminals, paired via devtok_...)
  ├── API Keys (Publishable/Secret keys: pk_live_, sk_live_, pk_test_, sk_test_)
  ├── Webhooks (Signed endpoints: whsec_..., delivery logs with exponential backoff)
  ├── Payments (Idempotent AUD-to-crypto transactions: BTC, ETH, USDT, USDC)
  └── Settlements (AUD batch payouts via Australian direct entry or NPP/Osko)
```

---

## 🔐 2. Authentication & Identity Provider Architecture

Authentication has been transitioned to a vendor-agnostic **Third-Party Identity Provider** architecture:

```
┌─────────────────────────────────────────────────────────────┐
│               THIRD-PARTY IDENTITY PROVIDERS                │
│       (Auth0 / AWS Cognito / Clerk / Supabase / OIDC)        │
└──────────────────────────────┬──────────────────────────────┘
                               │  User signs in / gets Bearer JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 CryptoPOS API Gateway / Guards              │
│                                                             │
│ 1. Human Dashboard Users:                                   │
│    Authorization: Bearer <idp_jwt>                          │
│    -> OidcIdentityProviderAdapter (JWKS signature check)    │
│    -> UsersService.findOrCreateFromIdentity()               │
│    -> Injects AuthContext { userId, orgId, role, perms }   │
│                                                             │
│ 2. Machine / SDK Integrations:                              │
│    X-Api-Key: sk_live_...                                   │
│    -> ApiKeyAuthGuard (Hashed key lookup)                   │
│                                                             │
│ 3. POS Terminals / Registers:                               │
│    X-Device-Token: devtok_...                               │
│    -> DeviceAuthGuard (Hashed device lookup)                │
│                                                             │
│ 4. Customer Checkout QR:                                    │
│    Public endpoints (GET /api/v1/payments/:id)              │
│    No customer account required                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Components:
- **`IIdentityProvider` interface**: Decouples domain logic from identity vendor SDKs (`src/modules/auth/identity-provider/identity-provider.interface.ts`).
- **`OidcIdentityProviderAdapter`**: Native Node.js `crypto` JWKS caching, signature verification, issuer & audience validator (`src/modules/auth/identity-provider/adapters/oidc-identity-provider.adapter.ts`).
- **`MockIdentityProviderAdapter`**: Instant dev/test adapter supporting mock tokens and local JWTs (`src/modules/auth/identity-provider/adapters/mock-identity-provider.adapter.ts`).
- **`IdentityProviderService`**: Router resolving the active identity adapter based on `AUTH_PROVIDER` (`src/modules/auth/identity-provider/identity-provider.service.ts`).
- **`UsersService`**: Auto-provisions and maps IdP `sub` + `email` claims to local `User` entities with organizations and roles (`src/modules/users/users.service.ts`).
- **`RolesGuard` & `@Roles(...)`**: Enforces granular role-based access control across routes (`src/common/guards/roles.guard.ts`).

---

## 🛠️ 3. Technology Stack & Dependencies

### Core Framework & Runtime
- **Node.js**: `20+ LTS`
- **Language**: TypeScript (`^5.7.3`) (Strict mode, 0 compiler errors)
- **Framework**: NestJS (`v11.0.1`)
  - `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
  - `@nestjs/config` (`v4.0.4`): Multi-tenant environment configuration (`appConfig`, `authConfig`, `databaseConfig`, `blockchainConfig`, `pricingConfig`)
  - `@nestjs/schedule` (`v6.1.3`): Scheduled tasks & stateless blockchain polling
  - `@nestjs/throttler` (`v6.5.0`): Rate limiting per tenant and IP
  - `@nestjs/swagger` (`v11.4.6`): OpenAPI 2.0 documentation at `/api/docs`

### Database & Persistence
- **Database**: PostgreSQL 16
- **ORM**: TypeORM (`v0.3.31`) via `@nestjs/typeorm` (`v11.0.3`)
- **Driver**: `pg` (`v8.22.0`)
- **Migrations**:
  1. `1725900000000-MultiTenantPlatformRefactor.ts`: Core multi-tenant tables.
  2. `1725910000000-AddUsersAndIdPAuth.ts`: Users table, IdP compound unique constraints, and merchant backfill.

### Real-Time & WebSockets
- **WebSocket Protocol**: Socket.io (`@nestjs/websockets` & `@nestjs/platform-socket.io` `v11.1.28`)
- **Namespace**: `/payments`
- **Channels**: `payment_<id>` (POS screen) and `org_<id>` (Live merchant feed)

### Blockchain & External Integrations
- **Ethereum**: `ethers` (`v6.17.0`) via JSON-RPC + Etherscan API + ERC-20 `Transfer` log scanning (USDT & USDC on Mainnet & Sepolia)
- **Bitcoin**: `bitcoinjs-lib` (`v7.0.1`) + Blockstream REST API (Mainnet & Testnet)
- **Pricing**: CoinGecko API with 30s proactive background cache refresh
- **Async Queue**: `QueueModule` with `IQueueService` interface (In-memory backoff queue for dev, SQS-ready)

---

## 📁 4. Codebase Structure

```
backend/
├── src/
│   ├── main.ts                                 # App bootstrap (OpenAPI, Helmet, CORS, Interceptors)
│   ├── app.module.ts                           # Root module aggregating all submodules & global queue/audit
│   ├── config/
│   │   ├── app.config.ts                       # App, auth, blockchain, pricing, webhook, queue configs
│   │   └── database.config.ts                  # TypeORM connection & migration settings
│   ├── common/
│   │   ├── interfaces/
│   │   │   └── auth-context.interface.ts       # AuthContext, AuthType, UserRole, ApiKeyScope
│   │   ├── decorators/
│   │   │   ├── current-tenant.decorator.ts     # @CurrentAuth, @CurrentOrg, @CurrentEnvironment, @CurrentLocation
│   │   │   ├── current-user.decorator.ts       # @CurrentUser
│   │   │   └── roles.decorator.ts              # @Roles(UserRole.OWNER, UserRole.ADMIN, ...)
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts        # Unified JSON error filter
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts               # IdP Bearer JWT guard
│   │   │   ├── roles.guard.ts                  # Role-based access control guard
│   │   │   ├── api-key-auth.guard.ts           # Hashed API Key guard + legacy fallback
│   │   │   ├── device-auth.guard.ts            # POS device token guard
│   │   │   └── composite-auth.guard.ts         # Unified multi-channel guard
│   │   └── interceptors/
│   │       └── transform.interceptor.ts        # Response wrapper: { success, data, timestamp }
│   ├── migrations/
│   │   ├── 1725900000000-MultiTenantPlatformRefactor.ts
│   │   └── 1725910000000-AddUsersAndIdPAuth.ts
│   └── modules/
│       ├── auth/                               # IdP authentication, profile sync, legacy fallback
│       │   └── identity-provider/              # IdP adapters (OIDC/JWKS, Mock, Auth0, Cognito, Clerk)
│       ├── users/                              # User records, team invitations, RBAC roles
│       ├── organizations/                      # Tenant management (CRUD, settings, currencies)
│       ├── merchants/                          # Business profiles, ABN, contacts, banking
│       ├── locations/                          # Store locations & sales channels
│       ├── devices/                            # POS register pairing (devtok_...)
│       ├── api-keys/                           # Hashed API keys (pk_live_, sk_live_, pk_test_, sk_test_)
│       ├── webhooks/                           # Signed webhooks (whsec_...), delivery queue & retries
│       ├── queue/                              # Queue abstraction (IQueueService) for async workloads
│       ├── audit/                              # Compliance & security audit logging
│       ├── payments/                           # Idempotent payments, QR, addresses, WebSockets
│       │   └── address/                        # Address allocation abstraction (IAddressProvider)
│       ├── blockchain/                         # Stateless DB polling & ERC-20 log decoder
│       ├── pricing/                            # Live AUD exchange rates with 30s cache
│       ├── settlements/                        # AUD batch payouts (IAudPayoutProvider)
│       ├── sandbox/                            # Test mode transaction simulator
│       └── analytics/                          # Multi-tenant and location-aware metrics
```

---

## 🗄️ 5. Database Entities & Schemas

### 1. `User` (`users`)
- `id`: UUID (Primary Key)
- `authProvider`: string (`'oidc'`, `'auth0'`, `'cognito'`, `'clerk'`, `'supabase'`, `'mock'`, `'legacy'`)
- `authProviderUserId`: string (Subject claim `sub` from IdP token)
- `email`: string (Indexed)
- `name`: string (Optional)
- `organizationId`: UUID (Indexed, Foreign Key to `organizations`)
- `merchantId`: UUID (Optional, Indexed)
- `role`: Enum (`'owner'`, `'admin'`, `'manager'`, `'cashier'`)
- `permissions`: string[] (e.g. `['*']`)
- `status`: Enum (`'active'`, `'suspended'`, `'pending'`)
- `metadata`: JSONB
- `lastLoginAt`: Timestamp
- `createdAt`, `updatedAt`: Timestamps
- **Compound Unique Index**: `UNIQUE(auth_provider, auth_provider_user_id)`

### 2. `Organization` (`organizations`)
- `id`: UUID (Primary Key)
- `name`: string
- `slug`: string (Unique, Indexed)
- `status`: Enum (`'active'`, `'pending'`, `'suspended'`)
- `defaultCurrency`: string (`'AUD'`)
- `settlementPreference`: string (`'crypto'` | `'aud'`)
- `settings`: JSONB
- `billingEmail`, `supportEmail`: string
- `createdAt`, `updatedAt`: Timestamps

### 3. `Merchant` (`merchants`)
- `id`: UUID (Primary Key)
- `organizationId`: UUID (Indexed, Foreign Key to `organizations`)
- `email`: string (Unique, Indexed)
- `businessName`: string
- `businessAbn`: string (11-digit ABN)
- `contactName`, `contactPhone`: string
- `address`, `city`, `state`, `postcode`: string
- `ethWalletAddress`, `btcWalletAddress`, `usdtWalletAddress`: string
- `acceptedCryptos`: string[] (`'ETH,BTC,USDT,USDC'`)
- `bankBsb`, `bankAccountNumber`: string (Australian banking)

### 4. `Location` (`locations`), `Device` (`devices`), `ApiKey` (`api_keys`), `Payment` (`payments`), `Settlement` (`settlements`), `WebhookEndpoint` (`webhook_endpoints`), `WebhookDelivery` (`webhook_deliveries`), `AuditLog` (`audit_logs`).

---

## 🌐 6. API Endpoints Table

Base URL: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api/docs`

| Module | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| **Auth** | `GET` | `/api/v1/auth/me` | Bearer JWT | Get current user profile & tenant context |
| | `POST` | `/api/v1/auth/sync` | Bearer JWT | Sync/provision user record from IdP token |
| | `POST` | `/api/v1/auth/register` | None | `[DEPRECATED]` Legacy registration |
| | `POST` | `/api/v1/auth/login` | None | `[DEPRECATED]` Legacy login |
| **Users** | `GET` | `/api/v1/users` | Bearer JWT (`admin`/`owner`) | List organization team members |
| | `POST` | `/api/v1/users` | Bearer JWT (`admin`/`owner`) | Invite / create user in organization |
| | `GET` | `/api/v1/users/:id` | Bearer JWT (`admin`/`owner`) | Get user details |
| | `PUT` | `/api/v1/users/:id` | Bearer JWT (`admin`/`owner`) | Update user role / permissions |
| | `DELETE` | `/api/v1/users/:id` | Bearer JWT (`admin`/`owner`) | Suspend user from organization |
| **Orgs** | `POST` | `/api/v1/organizations` | None | Organization onboarding |
| | `GET` | `/api/v1/organizations/current` | JWT | Get current organization profile |
| | `PUT` | `/api/v1/organizations/current` | JWT | Update organization settings |
| **Locations** | `POST` | `/api/v1/locations` | JWT | Create store location / channel |
| | `GET` | `/api/v1/locations` | JWT | List organization locations |
| | `GET` | `/api/v1/locations/:id` | JWT | Get location by ID |
| | `PUT` | `/api/v1/locations/:id` | JWT | Update location settings |
| | `DELETE` | `/api/v1/locations/:id` | JWT | Deactivate location |
| **Devices** | `POST` | `/api/v1/devices/register` | JWT | Register register & get pairing code |
| | `POST` | `/api/v1/devices/pair` | None | Pair POS device using code & get token |
| | `GET` | `/api/v1/devices` | JWT | List organization devices |
| | `DELETE` | `/api/v1/devices/:id/revoke` | JWT | Revoke device token |
| **API Keys** | `POST` | `/api/v1/api-keys` | JWT | Create live/test API key |
| | `GET` | `/api/v1/api-keys` | JWT | List organization API keys |
| | `DELETE` | `/api/v1/api-keys/:id` | JWT | Revoke API key |
| **Payments** | `POST` | `/api/v1/payments` | JWT / API Key / Device | Create idempotent payment request |
| | `GET` | `/api/v1/payments/:id` | None (Public) | Get payment details for QR screen |
| | `GET` | `/api/v1/payments/:id/status` | None (Public) | Lightweight polling status check |
| | `GET` | `/api/v1/payments` | JWT / API Key / Device | List filterable organization payments |
| **Webhooks** | `POST` | `/api/v1/webhooks/endpoints` | JWT | Register signed webhook listener |
| | `GET` | `/api/v1/webhooks/endpoints` | JWT | List webhook endpoints |
| | `DELETE` | `/api/v1/webhooks/endpoints/:id` | JWT | Deactivate webhook endpoint |
| | `GET` | `/api/v1/webhooks/deliveries` | JWT | List webhook delivery audit logs |
| **Settlements**| `POST` | `/api/v1/settlements/batch` | JWT | Create AUD payout batch |
| | `GET` | `/api/v1/settlements` | JWT | List settlement batches |
| | `GET` | `/api/v1/settlements/:id` | JWT | Get settlement batch details |
| **Sandbox** | `POST` | `/api/v1/sandbox/simulate-payment-tx` | None | Simulate test payment transaction |
| **Analytics** | `GET` | `/api/v1/analytics/dashboard` | JWT | Multi-tenant analytics dashboard |

---

## ⚡ 7. Verification & Test Suite

Run unit tests:
```bash
npm run test
```
Result: **10 passed, 10 total test suites, 36 passed tests**.

Run typecheck & build:
```bash
npx tsc --noEmit
npm run build
```
Result: **0 TypeScript compiler errors, clean NestJS production build**.

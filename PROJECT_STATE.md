# 🚀 CryptoPOS Multi-Tenant Platform — Project State & Handover Guide

> **Purpose**: This document provides a complete technical handover of the refactored CryptoPOS multi-tenant crypto payment platform. It outlines the architecture, tech stack, implemented modules, database entities, Third-Party Identity Provider authentication, External Wallet First MVP, Platform Administration & RBAC system, API endpoints, migration plan, security models, and verification steps.

---

## 📌 1. Platform Overview & Hierarchy

CryptoPOS is an enterprise-grade multi-tenant crypto payments platform designed for Australian businesses, omni-channel retail stores, and e-commerce integrations.

### Tenant, Platform & Entity Hierarchy:
```
Platform Administration
  ├── Super Admin (Unrestricted platform authority, bypasses micro-permissions)
  ├── Sub Admins (Invite-only, granular permissions & scoped to PLATFORM, ORGANIZATION, or MERCHANT)
  ├── System Roles (SUPER_ADMIN, OPERATIONS_ADMIN, SUPPORT_ADMIN, COMPLIANCE_ADMIN)
  ├── Admin Invitations (Cryptographic SHA-256 hashed single-use tokens, 7-day expiry)
  └── Platform Audit Logs (Comprehensive tamper-evident action history)

Organization (Tenant)
  ├── Users (Team members authenticated via Third-Party IdP: Auth0, Cognito, Clerk, Supabase, OIDC)
  │     └── Roles: owner, admin, manager, cashier
  ├── Wallets / Receiving Addresses (External merchant-controlled public addresses: BTC, ETH, USDT, USDC)
  ├── Merchants (Business profiles, AUSTRAC ABN, banking details, static wallets)
  ├── Locations (Physical stores, pop-ups, online checkouts)
  │     └── Devices (POS registers, Sunmi/iPad terminals, paired via devtok_...)
  ├── API Keys (Publishable/Secret keys: pk_live_, sk_live_, pk_test_, sk_test_)
  ├── Webhooks (Signed endpoints: whsec_..., delivery logs with exponential backoff)
  ├── Payments (Idempotent AUD-to-crypto transactions: BTC, ETH, USDT, USDC)
  └── Settlements (AUD batch payouts via Australian direct entry or NPP/Osko - Future Scope)
```

---

## 🔐 2. Authentication & Identity Provider Architecture

Authentication uses a vendor-agnostic **Third-Party Identity Provider** architecture:

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
│ 1. Platform Super Admins & Sub Admins:                      │
│    Authorization: Bearer <idp_jwt>                          │
│    -> CompositeAuthGuard -> PermissionsGuard -> ScopeGuard  │
│    -> Enforces granular permissions & tenant boundaries     │
│                                                             │
│ 2. Human Tenant / Merchant Users:                           │
│    Authorization: Bearer <idp_jwt>                          │
│    -> OidcIdentityProviderAdapter (JWKS signature check)    │
│    -> UsersService.findOrCreateFromIdentity()               │
│    -> Injects AuthContext { userId, orgId, role, perms }   │
│                                                             │
│ 3. Machine / SDK Integrations:                              │
│    X-Api-Key: sk_live_...                                   │
│    -> ApiKeyAuthGuard (Hashed key lookup)                   │
│                                                             │
│ 4. POS Terminals / Registers:                               │
│    X-Device-Token: devtok_...                               │
│    -> DeviceAuthGuard (Hashed device lookup)                │
│                                                             │
│ 5. Customer Checkout QR:                                    │
│    Public endpoints (GET /api/v1/payments/:id)              │
│    No customer account required                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛡️ 3. Platform Administration, Super Admin & RBAC

The platform governance and administrative subsystem enforces enterprise-grade security:
1. **Super Admin**:
   - Platform-wide unrestricted authority.
   - Bypasses micro-permission checks.
   - Protected: The system prevents deactivating or suspending the last active Super Admin.
2. **Invite-Only Sub Admins**:
   - Sub Admins cannot register publicly.
   - Invitations generated with 32-byte cryptographic secrets stored as `SHA-256(token)`.
   - Raw tokens are returned strictly once upon generation for dispatch.
3. **Escalation Prevention**:
   - Sub Admins cannot invite or promote users to Super Admin.
   - Sub Admins can only grant permissions and scopes that they themselves possess.
4. **Scope Levels (`AdminScopeLevel`)**:
   - `PLATFORM`: Platform-wide access.
   - `ORGANIZATION`: Scoped to one or more specific tenant organization IDs (`scopedOrganizationIds`).
   - `MERCHANT`: Scoped to one or more specific merchant profile IDs (`scopedMerchantIds`).
5. **System Predefined Roles**:
   - `SUPER_ADMIN`: `*` (Unrestricted platform administrative access)
   - `OPERATIONS_ADMIN`: `organizations.*,merchants.*,locations.*,devices.*,payments.*,settlements.*,wallets.*,analytics.*`
   - `SUPPORT_ADMIN`: `organizations.read,merchants.read,locations.read,devices.read,payments.read,payments.refund,settlements.read,analytics.read`
   - `COMPLIANCE_ADMIN`: `organizations.read,merchants.read,payments.read,settlements.read,audit_logs.read,analytics.read`

---

## 💳 4. External Wallet First MVP Architecture

For the React Native POS MVP, CryptoPOS operates under an **External Wallet First** model where payments go directly to the merchant's external, self-custodied receiving address.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           SECURITY BOUNDARY                              │
├─────────────────────────────────────────┬────────────────────────────────┤
│            CryptoPOS Stores:            │     Merchant Self-Custody:     │
│  - Public receiving wallet address      │  - Private keys                │
│  - Network (mainnet, sepolia, testnet)  │  - Seed / recovery phrases     │
│  - Asset (BTC, ETH, USDT, USDC)         │  - Hardware / software wallet  │
│  - Friendly label and metadata          │  - Signing & spending control  │
│  - Zero private keys or secrets stored  │  - Direct receipt of funds     │
└─────────────────────────────────────────┴────────────────────────────────┘
```

### Key Components:
- **`IWalletAddressValidator` & `WalletAddressValidatorService`**: Network- and asset-aware address validation using native `ethers` and `bitcoinjs-lib`. Validates checksums, formats (Bech32, P2PKH, P2SH, EIP-55), and rejects cross-chain mismatches.
- **`Wallet` Entity & `WalletsService`**: Manages external receiving addresses (`WalletType.EXTERNAL`), tenant isolation, primary address resolution, and security audit logging.
- **`PaymentAddressService` & `ExternalWalletAddressProvider`**: Resolves receiving address hierarchically:
  1. Location-specific primary address
  2. Location-specific active address
  3. Merchant-specific primary address
  4. Organization-wide primary address
  5. Fallback to `MerchantStaticAddressProvider` (legacy merchant fields)
- **Payment Immutability**: The resolved receiving address is locked onto the `Payment` record at creation time and never dynamically altered.

---

## 🛠️ 5. Technology Stack & Dependencies

### Core Framework & Runtime
- **Node.js**: `20+ LTS`
- **Language**: TypeScript (`^5.7.3`) (Strict mode, 0 compiler errors)
- **Framework**: NestJS (`v11.0.1`)
  - `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
  - `@nestjs/config` (`v4.0.4`): Multi-tenant environment configuration (`appConfig`, `authConfig`, `databaseConfig`, `blockchainConfig`, `pricingConfig`)
  - `@nestjs/schedule` (`v6.1.3`): Scheduled tasks & stateless blockchain polling
  - `@nestjs/throttler` (`v6.5.0`): Rate limiting per tenant and IP
  - `@nestjs/swagger` (`v11.4.6`): OpenAPI documentation at `/api/docs`

### Database & Persistence
- **Database**: PostgreSQL 16
- **ORM**: TypeORM (`v0.3.31`) via `@nestjs/typeorm` (`v11.0.3`)
- **Driver**: `pg` (`v8.22.0`)
- **Migrations**:
  1. `1725900000000-MultiTenantPlatformRefactor.ts`: Core multi-tenant tables.
  2. `1725910000000-AddUsersAndIdPAuth.ts`: Users table, IdP compound unique constraints, and merchant backfill.
  3. `1725920000000-CreateWalletsAndReceivingAddresses.ts`: Wallets table, enums, indices, and merchant static address backfill.
  4. `1725930000000-AddPlatformAdminRbacAndInvitations.ts`: Platform Admin RBAC, roles, admin_invitations, and system role seeds.

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

## 📁 6. Codebase Structure

```
backend/
├── src/
│   ├── main.ts                                 # App bootstrap (OpenAPI, Helmet, CORS, Interceptors)
│   ├── app.module.ts                           # Root module aggregating all submodules & global queue/audit
│   ├── config/
│   │   ├── app.config.ts                       # App, auth, blockchain, pricing, webhook, queue configs
│   │   └── database.config.ts                  # TypeORM connection & migration settings
│   ├── common/
│   │   ├── constants/
│   │   │   └── permissions.constant.ts         # PlatformPermission enum (domain.action + wildcard)
│   │   ├── interfaces/
│   │   │   └── auth-context.interface.ts       # AuthContext, AuthType, UserRole, AdminScopeLevel, ApiKeyScope
│   │   ├── decorators/
│   │   │   ├── current-tenant.decorator.ts     # @CurrentAuth, @CurrentOrg, @CurrentEnvironment, @CurrentLocation
│   │   │   ├── current-user.decorator.ts       # @CurrentUser
│   │   │   ├── roles.decorator.ts              # @Roles(UserRole.OWNER, UserRole.ADMIN, ...)
│   │   │   ├── permissions.decorator.ts        # @RequirePermissions(PlatformPermission.ADMINS_READ, ...)
│   │   │   └── scope.decorator.ts              # @RequireScope(AdminScopeLevel.PLATFORM)
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts        # Unified JSON error filter
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts               # IdP Bearer JWT guard
│   │   │   ├── roles.guard.ts                  # Role-based access control guard
│   │   │   ├── permissions.guard.ts            # Granular permission check guard (domain.* and *)
│   │   │   ├── scope.guard.ts                  # Multi-tenant and platform boundary guard
│   │   │   ├── api-key-auth.guard.ts           # Hashed API Key guard + legacy fallback
│   │   │   ├── device-auth.guard.ts            # POS device token guard
│   │   │   └── composite-auth.guard.ts         # Unified multi-channel guard
│   │   └── interceptors/
│   │       └── transform.interceptor.ts        # Response wrapper: { success, data, timestamp }
│   ├── migrations/
│   │   ├── 1725900000000-MultiTenantPlatformRefactor.ts
│   │   ├── 1725910000000-AddUsersAndIdPAuth.ts
│   │   ├── 1725920000000-CreateWalletsAndReceivingAddresses.ts
│   │   └── 1725930000000-AddPlatformAdminRbacAndInvitations.ts
│   └── modules/
│       ├── admin/                              # Platform administration, invitations, RBAC roles & governance
│       ├── auth/                               # IdP authentication, profile sync, legacy fallback
│       │   └── identity-provider/              # IdP adapters (OIDC/JWKS, Mock, Auth0, Cognito, Clerk)
│       ├── users/                              # User records, team invitations, RBAC roles
│       ├── wallets/                            # External receiving addresses, validation, primary routing
│       │   └── validation/                     # Network-aware BTC & EVM address validators
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

## 🗄️ 7. Database Entities & Schemas

### 1. `Role` (`roles`)
- `id`: UUID (Primary Key)
- `name`: string (Unique, Indexed) e.g. `'SUPER_ADMIN'`, `'OPERATIONS_ADMIN'`, `'SUPPORT_ADMIN'`, `'COMPLIANCE_ADMIN'`
- `description`: string
- `isSystem`: boolean (default `false`)
- `permissions`: simple-array (e.g. `['*']` or `['merchants.read', 'payments.read']`)
- `createdAt`, `updatedAt`: Timestamps

### 2. `AdminInvitation` (`admin_invitations`)
- `id`: UUID (Primary Key)
- `email`: string (Indexed)
- `invitedByUserId`: string (Indexed)
- `roleId`: string
- `permissions`: simple-array
- `scopeLevel`: Enum (`'PLATFORM'`, `'ORGANIZATION'`, `'MERCHANT'`)
- `scopedOrganizationIds`: simple-array
- `scopedMerchantIds`: simple-array
- `tokenHash`: string (SHA-256 hash, Indexed)
- `status`: Enum (`'PENDING'`, `'ACCEPTED'`, `'EXPIRED'`, `'REVOKED'`, Indexed)
- `expiresAt`: Date (7 days from generation)
- `acceptedAt`: Date
- `acceptedByUserId`: UUID
- `revokedAt`: Date
- `createdAt`, `updatedAt`: Timestamps

### 3. `Wallet` (`wallets`), `User` (`users`), `Organization` (`organizations`), `Merchant` (`merchants`), `Location` (`locations`), `Device` (`devices`), `ApiKey` (`api_keys`), `Payment` (`payments`), `Settlement` (`settlements`), `WebhookEndpoint` (`webhook_endpoints`), `WebhookDelivery` (`webhook_deliveries`), `AuditLog` (`audit_logs`).

---

## 🌐 8. API Endpoints Table

Base URL: `http://localhost:3000/api/v1`  
Swagger UI: `http://localhost:3000/api/docs`

| Module | Method | Endpoint | Auth | Description |
|---|---|---|---|---|
| **Admin** | `POST` | `/api/v1/admin/invitations` | JWT (`admins.invite`) | Invite a new platform Sub-Admin |
| | `GET` | `/api/v1/admin/invitations` | JWT (`admins.read`) | List pending/accepted/revoked invitations |
| | `DELETE` | `/api/v1/admin/invitations/:id` | JWT (`admins.write`) | Revoke an admin invitation |
| | `POST` | `/api/v1/admin/invitations/accept` | Public / IdP | Accept admin invitation via cryptographic token |
| | `GET` | `/api/v1/admin/admins` | JWT (`admins.read`) | List platform admins (filterable & paginated) |
| | `GET` | `/api/v1/admin/admins/:id` | JWT (`admins.read`) | Get details of a specific admin |
| | `PATCH` | `/api/v1/admin/admins/:id` | JWT (`admins.write`) | Update admin role, permissions, or scope |
| | `POST` | `/api/v1/admin/admins/:id/deactivate` | JWT (`admins.write`) | Suspend admin (Protected for last Super Admin) |
| | `POST` | `/api/v1/admin/admins/:id/activate` | JWT (`admins.write`) | Reactivate admin account |
| | `GET` | `/api/v1/admin/roles` | JWT (`admins.read`) | List platform system & custom roles |
| | `POST` | `/api/v1/admin/roles` | JWT (`admins.write`) | Create custom administrative role |
| | `GET` | `/api/v1/admin/permissions` | JWT (`admins.read`) | List all available permissions grouped by category |
| | `GET` | `/api/v1/admin/audit-logs` | JWT (`audit_logs.read`) | Query platform administrative audit trail |
| **Wallets** | `POST` | `/api/v1/wallets/validate` | None / Any | Pre-flight validation of receiving address format |
| | `POST` | `/api/v1/wallets` | Bearer JWT (`admin`/`owner`/`manager`) | Register & activate external receiving wallet |
| | `GET` | `/api/v1/wallets` | Bearer JWT | List organization receiving wallet addresses |
| | `GET` | `/api/v1/wallets/:id` | Bearer JWT | Get wallet details |
| | `PUT` | `/api/v1/wallets/:id` | Bearer JWT (`admin`/`owner`/`manager`) | Update wallet label / primary status |
| | `DELETE` | `/api/v1/wallets/:id` | Bearer JWT (`admin`/`owner`) | Archive/deactivate receiving wallet |
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

## ⚡ 9. Verification & Test Suite

Run unit tests:
```bash
npm run test
```
Result: **15 passed, 15 total test suites, 77 passed tests**.

Run typecheck & build:
```bash
npx tsc --noEmit
npm run build
```
Result: **0 TypeScript compiler errors, clean NestJS production build**.

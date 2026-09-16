// src/common/interfaces/auth-context.interface.ts

export type AuthType = 'jwt' | 'api_key' | 'device';
export type Environment = 'live' | 'test';

export enum UserRole {
  SUPER_ADMIN = 'super_admin', // Platform Super Admin
  SUB_ADMIN = 'sub_admin', // Platform Sub Admin
  OWNER = 'owner', // Merchant/Organization Owner
  ADMIN = 'admin', // Merchant/Organization Admin
  MANAGER = 'manager', // Store Manager
  CASHIER = 'cashier', // Cashier/POS Operator
}

export enum AdminScopeLevel {
  PLATFORM = 'PLATFORM',
  ORGANIZATION = 'ORGANIZATION',
  MERCHANT = 'MERCHANT',
  LOCATION = 'LOCATION',
  DEVICE = 'DEVICE',
}

export interface AuthContext {
  organizationId?: string;
  userId?: string;
  externalIdentityId?: string; // sub claim from IdP token
  authProvider?: string;
  role?: UserRole;
  permissions?: string[];
  isSuperAdmin?: boolean;
  isPlatformAdmin?: boolean;
  scopeLevel?: AdminScopeLevel;
  scopedOrganizationIds?: string[];
  scopedMerchantIds?: string[];
  merchantId?: string;
  locationId?: string;
  deviceId?: string;
  apiKeyId?: string;
  environment: Environment;
  scopes: string[];
  authType: AuthType;
  email?: string;
  name?: string;
  businessName?: string;
}

export enum ApiKeyScope {
  PAYMENTS_READ = 'payments:read',
  PAYMENTS_WRITE = 'payments:write',
  MERCHANTS_READ = 'merchants:read',
  MERCHANTS_WRITE = 'merchants:write',
  LOCATIONS_READ = 'locations:read',
  LOCATIONS_WRITE = 'locations:write',
  DEVICES_READ = 'devices:read',
  DEVICES_WRITE = 'devices:write',
  SETTLEMENTS_READ = 'settlements:read',
  SETTLEMENTS_WRITE = 'settlements:write',
  WEBHOOKS_MANAGE = 'webhooks:manage',
  ANALYTICS_READ = 'analytics:read',
  ALL = '*',
}

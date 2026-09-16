// src/common/constants/permissions.constant.ts

export enum PlatformPermission {
  // Organizations
  ORGANIZATIONS_READ = 'organizations.read',
  ORGANIZATIONS_CREATE = 'organizations.create',
  ORGANIZATIONS_UPDATE = 'organizations.update',
  ORGANIZATIONS_DELETE = 'organizations.delete',

  // Merchants
  MERCHANTS_READ = 'merchants.read',
  MERCHANTS_CREATE = 'merchants.create',
  MERCHANTS_UPDATE = 'merchants.update',
  MERCHANTS_DELETE = 'merchants.delete',

  // Locations
  LOCATIONS_READ = 'locations.read',
  LOCATIONS_CREATE = 'locations.create',
  LOCATIONS_UPDATE = 'locations.update',
  LOCATIONS_DELETE = 'locations.delete',

  // Devices
  DEVICES_READ = 'devices.read',
  DEVICES_CREATE = 'devices.create',
  DEVICES_UPDATE = 'devices.update',
  DEVICES_REVOKE = 'devices.revoke',

  // Payments & Transactions
  PAYMENTS_READ = 'payments.read',
  PAYMENTS_EXPORT = 'payments.export',
  PAYMENTS_REFUND = 'payments.refund',
  TRANSACTIONS_READ = 'transactions.read',

  // Settlements
  SETTLEMENTS_READ = 'settlements.read',
  SETTLEMENTS_MANAGE = 'settlements.manage',

  // API Keys
  API_KEYS_READ = 'api_keys.read',
  API_KEYS_CREATE = 'api_keys.create',
  API_KEYS_REVOKE = 'api_keys.revoke',

  // Webhooks
  WEBHOOKS_READ = 'webhooks.read',
  WEBHOOKS_CREATE = 'webhooks.create',
  WEBHOOKS_UPDATE = 'webhooks.update',
  WEBHOOKS_DELETE = 'webhooks.delete',

  // Wallets & Receiving Addresses
  WALLETS_READ = 'wallets.read',
  WALLETS_CREATE = 'wallets.create',
  WALLETS_UPDATE = 'wallets.update',
  WALLETS_DELETE = 'wallets.delete',

  // Analytics
  ANALYTICS_READ = 'analytics.read',
  ANALYTICS_EXPORT = 'analytics.export',

  // Admin & Team Management
  ADMINS_READ = 'admins.read',
  ADMINS_INVITE = 'admins.invite',
  ADMINS_UPDATE = 'admins.update',
  ADMINS_WRITE = 'admins.write',
  ADMINS_DISABLE = 'admins.disable',

  // Audit Logs
  AUDIT_LOGS_READ = 'audit_logs.read',

  // Platform Settings & Assets
  PLATFORM_SETTINGS_READ = 'platform_settings.read',
  PLATFORM_SETTINGS_UPDATE = 'platform_settings.update',

  // Wildcard Full Access
  ALL = '*',
}

export const ALL_PLATFORM_PERMISSIONS: PlatformPermission[] = Object.values(
  PlatformPermission,
).filter((p) => p !== PlatformPermission.ALL);

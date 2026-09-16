// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  jwtSecret:
    process.env.JWT_SECRET ||
    'crypto-pos-dev-secret-change-in-production-min-32-chars',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  environment: process.env.NODE_ENV || 'development',
  webhookSecret:
    process.env.WEBHOOK_SECRET || 'whsec_default_secret_key_change_me',
  queueDriver: process.env.QUEUE_DRIVER || 'memory', // 'memory' | 'sqs' | 'redis'
}));

export const authConfig = registerAs('auth', () => ({
  provider: process.env.AUTH_PROVIDER || 'mock', // 'oidc' | 'auth0' | 'cognito' | 'clerk' | 'supabase' | 'mock'
  issuerUrl: process.env.AUTH_ISSUER_URL || 'https://dev-auth.cryptopos.io/',
  audience: process.env.AUTH_AUDIENCE || 'https://api.cryptopos.io',
  jwksUri: process.env.AUTH_JWKS_URI, // If custom JWKS endpoint
  clientId: process.env.AUTH_CLIENT_ID,
  mockSecret:
    process.env.AUTH_MOCK_SECRET || 'crypto-pos-mock-jwt-secret-for-dev',
}));

export const blockchainConfig = registerAs('blockchain', () => ({
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://ethereum-rpc.publicnode.com',
    sepoliaRpcUrl:
      process.env.ETH_SEPOLIA_RPC_URL ||
      'https://ethereum-sepolia-rpc.publicnode.com',
    apiKey: process.env.ETH_API_KEY || '',
    networkId: process.env.ETH_NETWORK_ID
      ? parseInt(process.env.ETH_NETWORK_ID, 10)
      : 1,
    // ERC-20 Token Addresses (Mainnet)
    usdtContractAddress:
      process.env.USDT_CONTRACT_ADDRESS ||
      '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdcContractAddress:
      process.env.USDC_CONTRACT_ADDRESS ||
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    // ERC-20 Token Addresses (Sepolia)
    sepoliaUsdtContractAddress:
      process.env.SEPOLIA_USDT_CONTRACT_ADDRESS ||
      '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    sepoliaUsdcContractAddress:
      process.env.SEPOLIA_USDC_CONTRACT_ADDRESS ||
      '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  },
  bitcoin: {
    apiUrl: process.env.BTC_API_URL || 'https://blockstream.info/api',
    testnetApiUrl:
      process.env.BTC_TESTNET_API_URL || 'https://blockstream.info/testnet/api',
    network: process.env.BTC_NETWORK || 'mainnet',
  },
  paymentTimeoutMinutes: process.env.PAYMENT_TIMEOUT_MINUTES
    ? parseInt(process.env.PAYMENT_TIMEOUT_MINUTES, 10)
    : 15,
  confirmationsRequired: {
    ETH: process.env.ETH_CONFIRMATIONS
      ? parseInt(process.env.ETH_CONFIRMATIONS, 10)
      : 2,
    BTC: process.env.BTC_CONFIRMATIONS
      ? parseInt(process.env.BTC_CONFIRMATIONS, 10)
      : 1,
    USDT_ERC20: process.env.USDT_CONFIRMATIONS
      ? parseInt(process.env.USDT_CONFIRMATIONS, 10)
      : 2,
    USDC_ERC20: process.env.USDC_CONFIRMATIONS
      ? parseInt(process.env.USDC_CONFIRMATIONS, 10)
      : 2,
  },
}));

export const pricingConfig = registerAs('pricing', () => ({
  coingeckoApiUrl:
    process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3',
  priceRefreshIntervalMs: process.env.PRICE_REFRESH_MS
    ? parseInt(process.env.PRICE_REFRESH_MS, 10)
    : 30000,
  slippagePercent: process.env.SLIPPAGE_PERCENT
    ? parseFloat(process.env.SLIPPAGE_PERCENT)
    : 1.0,
}));

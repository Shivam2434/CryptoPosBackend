// src/config/app.config.ts
import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    environment: process.env.NODE_ENV || 'development',
}));

export const blockchainConfig = registerAs('blockchain', () => ({
    ethereum: {
        rpcUrl: process.env.ETH_RPC_URL, // Alchemy or Infura
        apiKey: process.env.ETH_API_KEY,
        networkId: process.env.ETH_NETWORK_ID ? parseInt(process.env.ETH_NETWORK_ID, 10) : 1,
    },
    bitcoin: {
        apiUrl: process.env.BTC_API_URL || 'https://blockstream.info/api',
        network: process.env.BTC_NETWORK || 'mainnet',
    },
    paymentTimeoutMinutes: process.env.PAYMENT_TIMEOUT_MINUTES ? parseInt(process.env.PAYMENT_TIMEOUT_MINUTES, 10) : 15,
    confirmationsRequired: {
        ETH: process.env.ETH_CONFIRMATIONS ? parseInt(process.env.ETH_CONFIRMATIONS, 10) : 2,
        BTC: process.env.BTC_CONFIRMATIONS ? parseInt(process.env.BTC_CONFIRMATIONS, 10) : 1,
    },
}));

export const pricingConfig = registerAs('pricing', () => ({
    coingeckoApiUrl: 'https://api.coingecko.com/api/v3',
    priceRefreshIntervalMs: process.env.PRICE_REFRESH_MS ? parseInt(process.env.PRICE_REFRESH_MS, 10) : 30000,
    slippagePercent: process.env.SLIPPAGE_PERCENT ? parseFloat(process.env.SLIPPAGE_PERCENT) : 1.0,
}));
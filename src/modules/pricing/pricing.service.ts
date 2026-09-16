// src/modules/pricing/pricing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CryptoType } from '../payments/entities/payment.entity';

interface PriceCache {
  [key: string]: {
    price: number;
    timestamp: number;
  };
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private priceCache: PriceCache = {};
  private readonly apiUrl: string;

  constructor(private configService: ConfigService) {
    this.apiUrl =
      configService.get<string>('pricing.coingeckoApiUrl') ||
      'https://api.coingecko.com/api/v3';
    this.refreshPrices().catch(() => {});
  }

  async getExchangeRate(
    cryptoType: CryptoType,
    fiatCurrency = 'AUD',
  ): Promise<number> {
    const cacheKey = `${cryptoType}_${fiatCurrency}`;
    const cached = this.priceCache[cacheKey];
    const maxAge =
      this.configService.get<number>('pricing.priceRefreshIntervalMs') || 30000;

    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.price;
    }

    return this.fetchPrice(cryptoType, fiatCurrency);
  }

  async getAllPrices(fiatCurrency = 'AUD'): Promise<Record<string, number>> {
    const cryptos = Object.values(CryptoType);
    const prices: Record<string, number> = {};

    for (const crypto of cryptos) {
      try {
        prices[crypto] = await this.getExchangeRate(crypto, fiatCurrency);
      } catch (e: any) {
        this.logger.error(`Failed to get price for ${crypto}: ${e.message}`);
      }
    }

    return prices;
  }

  private async fetchPrice(
    cryptoType: CryptoType,
    fiatCurrency: string,
  ): Promise<number> {
    const coinId = this.getCoinGeckoId(cryptoType);
    const fiat = fiatCurrency.toLowerCase();

    try {
      const response = await axios.get(
        `${this.apiUrl}/simple/price?ids=${coinId}&vs_currencies=${fiat}`,
        { timeout: 5000 },
      );

      const price = response.data[coinId]?.[fiat];
      if (!price) {
        throw new Error(`No price data for ${cryptoType}`);
      }

      // Cache it
      this.priceCache[`${cryptoType}_${fiatCurrency}`] = {
        price,
        timestamp: Date.now(),
      };

      return price;
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${cryptoType}: ${error.message}`,
      );

      // Return cached price if available (even if stale)
      const cached = this.priceCache[`${cryptoType}_${fiatCurrency}`];
      if (cached) return cached.price;

      // Fallback default pricing for dev if network is unavailable
      const defaultPrices: Record<string, number> = {
        [CryptoType.BTC]: 95000,
        [CryptoType.ETH]: 4500,
        [CryptoType.USDT_ERC20]: 1.55,
        [CryptoType.USDC_ERC20]: 1.55,
      };

      return defaultPrices[cryptoType] || 1.0;
    }
  }

  private getCoinGeckoId(cryptoType: CryptoType): string {
    const mapping: Record<CryptoType, string> = {
      [CryptoType.BTC]: 'bitcoin',
      [CryptoType.ETH]: 'ethereum',
      [CryptoType.USDT_ERC20]: 'tether',
      [CryptoType.USDC_ERC20]: 'usd-coin',
    };
    return mapping[cryptoType] || 'ethereum';
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async refreshPrices() {
    this.logger.debug('Refreshing crypto prices in AUD...');
    try {
      const response = await axios.get(
        `${this.apiUrl}/simple/price?ids=bitcoin,ethereum,tether,usd-coin&vs_currencies=aud`,
        { timeout: 5000 },
      );

      const data = response.data;
      const now = Date.now();

      if (data.bitcoin?.aud) {
        this.priceCache['BTC_AUD'] = {
          price: data.bitcoin.aud,
          timestamp: now,
        };
      }
      if (data.ethereum?.aud) {
        this.priceCache['ETH_AUD'] = {
          price: data.ethereum.aud,
          timestamp: now,
        };
      }
      if (data.tether?.aud) {
        this.priceCache['USDT_ERC20_AUD'] = {
          price: data.tether.aud,
          timestamp: now,
        };
      }
      if (data['usd-coin']?.aud) {
        this.priceCache['USDC_ERC20_AUD'] = {
          price: data['usd-coin'].aud,
          timestamp: now,
        };
      }

      this.logger.debug(
        `Prices refreshed: BTC=$${data.bitcoin?.aud} ETH=$${data.ethereum?.aud} USDT=$${data.tether?.aud}`,
      );
    } catch (error) {
      this.logger.warn(`Price refresh failed (using cache): ${error.message}`);
    }
  }
}

// src/modules/pricing/pricing.controller.ts
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CryptoType } from '../payments/entities/payment.entity';

@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private pricingService: PricingService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get current crypto exchange rates in fiat (AUD)' })
  @ApiQuery({ name: 'fiat', required: false, example: 'AUD' })
  @ApiResponse({ status: 200, description: 'Live crypto exchange rates map' })
  async getRates(@Query('fiat') fiat = 'AUD') {
    const rates = await this.pricingService.getAllPrices(fiat.toUpperCase());
    return {
      rates,
      fiat: fiat.toUpperCase(),
      timestamp: Date.now(),
    };
  }

  @Get('rate/:crypto')
  @ApiOperation({
    summary: 'Get current exchange rate for a specific cryptocurrency',
  })
  @ApiQuery({ name: 'fiat', required: false, example: 'AUD' })
  async getRate(
    @Param('crypto') crypto: string,
    @Query('fiat') fiat = 'AUD',
  ) {
    const rate = await this.pricingService.getExchangeRate(
      crypto as CryptoType,
      fiat.toUpperCase(),
    );
    return {
      crypto,
      rate,
      fiat: fiat.toUpperCase(),
      timestamp: Date.now(),
    };
  }
}

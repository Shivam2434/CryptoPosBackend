// src/modules/pricing/pricing.module.ts
import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';

@Module({
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}

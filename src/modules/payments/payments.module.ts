// src/modules/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsGateway } from './payments.gateway';
import { PricingModule } from '../pricing/pricing.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { DevicesModule } from '../devices/devices.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { WalletsModule } from '../wallets/wallets.module';
import { PaymentAddressService } from './address/payment-address.service';
import { ExternalWalletAddressProvider } from './address/external-wallet-address.provider';
import { MerchantStaticAddressProvider } from './address/merchant-static-address.provider';
import { PoolAddressProvider } from './address/pool-address.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    PricingModule,
    MerchantsModule,
    OrganizationsModule,
    ApiKeysModule,
    DevicesModule,
    WebhooksModule,
    WalletsModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsGateway,
    PaymentAddressService,
    ExternalWalletAddressProvider,
    MerchantStaticAddressProvider,
    PoolAddressProvider,
  ],
  exports: [PaymentsService, PaymentsGateway, PaymentAddressService],
})
export class PaymentsModule {}

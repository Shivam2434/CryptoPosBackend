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
import { PaymentAddressService } from './address/payment-address.service';
import { MerchantStaticAddressProvider } from './address/merchant-static-address.provider';
import { PoolAddressProvider } from './address/pool-address.provider';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiKeyAuthGuard } from '../../common/guards/api-key-auth.guard';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { CompositeAuthGuard } from '../../common/guards/composite-auth.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([Payment]),
        PricingModule,
        MerchantsModule,
        OrganizationsModule,
        ApiKeysModule,
        DevicesModule,
        WebhooksModule,
    ],
    controllers: [PaymentsController],
    providers: [
        PaymentsService,
        PaymentsGateway,
        PaymentAddressService,
        MerchantStaticAddressProvider,
        PoolAddressProvider,
        JwtAuthGuard,
        ApiKeyAuthGuard,
        DeviceAuthGuard,
        CompositeAuthGuard,
    ],
    exports: [PaymentsService, PaymentsGateway, PaymentAddressService, CompositeAuthGuard, JwtAuthGuard, ApiKeyAuthGuard, DeviceAuthGuard],
})
export class PaymentsModule { }
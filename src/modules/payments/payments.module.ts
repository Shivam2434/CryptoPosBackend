// src/modules/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsGateway } from './payments.gateway';
import { PricingModule } from '../pricing/pricing.module';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Payment]),
        PricingModule,
        forwardRef(() => BlockchainModule),
        MerchantsModule,
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, PaymentsGateway],
    exports: [PaymentsService, PaymentsGateway],
})
export class PaymentsModule { }
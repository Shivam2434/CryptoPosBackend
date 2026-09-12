// src/modules/settlements/settlements.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './entities/settlement.entity';
import { Payment } from '../payments/entities/payment.entity';
import { SettlementsService } from './settlements.service';
import { SettlementsController } from './settlements.controller';
import { MerchantsModule } from '../merchants/merchants.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { ManualBankPayoutProvider } from './providers/manual-bank-payout.provider';
import { MockPayoutProvider } from './providers/mock-payout.provider';

@Module({
    imports: [
        TypeOrmModule.forFeature([Settlement, Payment]),
        MerchantsModule,
        WebhooksModule,
    ],
    controllers: [SettlementsController],
    providers: [
        SettlementsService,
        ManualBankPayoutProvider,
        MockPayoutProvider,
    ],
    exports: [SettlementsService],
})
export class SettlementsModule { }
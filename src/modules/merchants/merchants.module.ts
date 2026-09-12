// src/modules/merchants/merchants.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from './entities/merchant.entity';
import { MerchantsService } from './merchants.service';
import { MerchantsController } from './merchants.controller';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Merchant]),
        OrganizationsModule,
    ],
    controllers: [MerchantsController],
    providers: [MerchantsService],
    exports: [MerchantsService],
})
export class MerchantsModule { }
// src/modules/settlements/settlements.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Settlement } from './entities/settlement.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Settlement])],
})
export class SettlementsModule { }
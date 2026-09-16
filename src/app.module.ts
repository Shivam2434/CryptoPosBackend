// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import {
  appConfig,
  authConfig,
  blockchainConfig,
  pricingConfig,
} from './config/app.config';
import { databaseConfig } from './config/database.config';
import { QueueModule } from './modules/queue/queue.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DevicesModule } from './modules/devices/devices.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { SettlementsModule } from './modules/settlements/settlements.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SandboxModule } from './modules/sandbox/sandbox.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        authConfig,
        blockchainConfig,
        pricingConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions =>
        config.get<TypeOrmModuleOptions>('database') || {
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'postgres',
          password: 'password',
          database: 'crypto_pos',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        },
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 1000 }]),
    ScheduleModule.forRoot(),
    QueueModule,
    AuditModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    MerchantsModule,
    LocationsModule,
    DevicesModule,
    ApiKeysModule,
    WebhooksModule,
    PaymentsModule,
    BlockchainModule,
    PricingModule,
    SettlementsModule,
    AnalyticsModule,
    SandboxModule,
    WalletsModule,
    AdminModule,
  ],
})
export class AppModule {}

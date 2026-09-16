// src/modules/wallets/wallets.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Wallet } from './entities/wallet.entity';
import { WalletsService } from './wallets.service';
import { WalletsController } from './wallets.controller';
import { WalletAddressValidatorService } from './validation/wallet-address-validator.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet]), forwardRef(() => AuthModule)],
  controllers: [WalletsController],
  providers: [WalletAddressValidatorService, WalletsService],
  exports: [WalletsService, WalletAddressValidatorService],
})
export class WalletsModule {}

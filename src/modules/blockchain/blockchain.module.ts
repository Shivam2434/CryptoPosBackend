// src/modules/blockchain/blockchain.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../payments/entities/payment.entity';
import { BlockchainService } from './blockchain.service';
import { EthereumProvider } from './providers/ethereum.provider';
import { BitcoinProvider } from './providers/bitcoin.provider';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    forwardRef(() => PaymentsModule),
  ],
  providers: [BlockchainService, EthereumProvider, BitcoinProvider],
  exports: [BlockchainService, EthereumProvider, BitcoinProvider],
})
export class BlockchainModule {}

// src/modules/blockchain/blockchain.module.ts
import { Module, forwardRef, OnModuleInit } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { EthereumProvider } from './providers/ethereum.provider';
import { BitcoinProvider } from './providers/bitcoin.provider';
import { PaymentsModule } from '../payments/payments.module';
import { ModuleRef } from '@nestjs/core';

@Module({
    imports: [forwardRef(() => PaymentsModule)],
    providers: [BlockchainService, EthereumProvider, BitcoinProvider],
    exports: [BlockchainService],
})
export class BlockchainModule implements OnModuleInit {
    constructor(private moduleRef: ModuleRef) { }

    async onModuleInit() {
        // Resolve circular dependency after initialization
        const blockchainService = this.moduleRef.get(BlockchainService);
        try {
            const { PaymentsService } = await import(
                '../payments/payments.service'
            );
            const { PaymentsGateway } = await import(
                '../payments/payments.gateway'
            );
            const paymentsService = this.moduleRef.get(PaymentsService);
            const paymentsGateway = this.moduleRef.get(PaymentsGateway);
            blockchainService.setDependencies(
                paymentsService,
                paymentsGateway,
            );
        } catch (e) {
            // Will be available after full bootstrap
        }
    }
}
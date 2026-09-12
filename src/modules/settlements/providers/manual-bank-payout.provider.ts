// src/modules/settlements/providers/manual-bank-payout.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IAudPayoutProvider, PayoutRequest, PayoutResult } from './payout-provider.interface';

@Injectable()
export class ManualBankPayoutProvider implements IAudPayoutProvider {
    readonly providerName = 'manual_bank';
    private readonly logger = new Logger(ManualBankPayoutProvider.name);

    async executePayout(request: PayoutRequest): Promise<PayoutResult> {
        const batchRef = `ABA-${Date.now().toString().substring(4)}-${request.settlementId.substring(0, 6).toUpperCase()}`;
        this.logger.log(`Manual bank transfer batch created for settlement ${request.settlementId}: $${request.netAudAmount} AUD (Ref: ${batchRef})`);

        return {
            providerReference: batchRef,
            status: 'processing',
            estimatedArrival: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next business day
            metadata: {
                transferMethod: 'AU_BECS_DIRECT_ENTRY',
                bsb: request.bankBsb,
                accountNumber: request.bankAccountNumber ? `****${request.bankAccountNumber.slice(-4)}` : undefined,
            },
        };
    }
}

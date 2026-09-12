// src/modules/settlements/providers/mock-payout.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { IAudPayoutProvider, PayoutRequest, PayoutResult } from './payout-provider.interface';

@Injectable()
export class MockPayoutProvider implements IAudPayoutProvider {
    readonly providerName = 'mock';
    private readonly logger = new Logger(MockPayoutProvider.name);

    async executePayout(request: PayoutRequest): Promise<PayoutResult> {
        const mockRef = `MOCK-NPP-${Date.now().toString().substring(6)}`;
        this.logger.log(`Mock sandbox instant settlement executed for ${request.settlementId}: $${request.netAudAmount} AUD`);

        return {
            providerReference: mockRef,
            status: 'completed',
            estimatedArrival: new Date(),
            metadata: {
                simulation: true,
                rail: 'NEW_PAYMENTS_PLATFORM_OSKO',
            },
        };
    }
}

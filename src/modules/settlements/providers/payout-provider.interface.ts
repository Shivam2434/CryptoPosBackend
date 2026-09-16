// src/modules/settlements/providers/payout-provider.interface.ts

export interface PayoutRequest {
  settlementId: string;
  organizationId: string;
  netAudAmount: number;
  bankBsb?: string;
  bankAccountNumber?: string;
  accountName?: string;
  reference: string;
}

export interface PayoutResult {
  providerReference: string;
  status: 'processing' | 'completed' | 'failed';
  estimatedArrival?: Date;
  metadata?: Record<string, any>;
}

export interface IAudPayoutProvider {
  readonly providerName: string;
  executePayout(request: PayoutRequest): Promise<PayoutResult>;
}

// src/modules/settlements/settlements.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SettlementsService } from './settlements.service';
import { Settlement, SettlementStatus } from './entities/settlement.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { MerchantsService } from '../merchants/merchants.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ManualBankPayoutProvider } from './providers/manual-bank-payout.provider';
import { MockPayoutProvider } from './providers/mock-payout.provider';

describe('SettlementsService', () => {
    let service: SettlementsService;
    let settlementsRepo: any;
    let paymentsRepo: any;
    let merchantsService: any;
    let webhooksService: any;
    let manualBankProvider: any;
    let mockProvider: any;

    beforeEach(async () => {
        settlementsRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'settle-uuid-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            find: jest.fn(),
            findOne: jest.fn(),
        };

        paymentsRepo = {
            find: jest.fn(),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
        };

        merchantsService = {
            findByOrganization: jest.fn().mockResolvedValue([
                {
                    id: 'merchant-1',
                    businessName: 'Coffee Hub',
                    bankBsb: '123-456',
                    bankAccountNumber: '987654321',
                },
            ]),
        };

        webhooksService = {
            dispatchEvent: jest.fn().mockResolvedValue(undefined),
        };

        manualBankProvider = {
            providerName: 'manual_bank',
            executePayout: jest.fn().mockResolvedValue({
                providerReference: 'ABA-1234-SETTLE',
                status: 'processing',
            }),
        };

        mockProvider = {
            providerName: 'mock',
            executePayout: jest.fn().mockResolvedValue({
                providerReference: 'MOCK-NPP-1234',
                status: 'completed',
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettlementsService,
                { provide: getRepositoryToken(Settlement), useValue: settlementsRepo },
                { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
                { provide: MerchantsService, useValue: merchantsService },
                { provide: WebhooksService, useValue: webhooksService },
                { provide: ManualBankPayoutProvider, useValue: manualBankProvider },
                { provide: MockPayoutProvider, useValue: mockProvider },
            ],
        }).compile();

        service = module.get<SettlementsService>(SettlementsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create an AUD settlement batch and deduct platform fee', async () => {
        paymentsRepo.find.mockResolvedValue([
            { id: 'pay-1', audAmount: 100, cryptoAmount: 0.025, status: PaymentStatus.CONFIRMED },
            { id: 'pay-2', audAmount: 200, cryptoAmount: 0.050, status: PaymentStatus.CONFIRMED },
        ]);

        const result = await service.createBatch('org-uuid-1');

        expect(result.audAmount).toBe(300);
        expect(result.feeAudAmount).toBe(3.00); // 1% fee
        expect(result.netAudAmount).toBe(297.00);
        expect(result.status).toBe(SettlementStatus.PROCESSING);
        expect(manualBankProvider.executePayout).toHaveBeenCalled();
        expect(paymentsRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should support instant simulation in sandbox mode with MockPayoutProvider', async () => {
        paymentsRepo.find.mockResolvedValue([
            { id: 'pay-1', audAmount: 50, cryptoAmount: 0.01, status: PaymentStatus.CONFIRMED },
        ]);

        const result = await service.createBatch('org-uuid-1', { payoutProvider: 'mock' });

        expect(result.status).toBe(SettlementStatus.COMPLETED);
        expect(mockProvider.executePayout).toHaveBeenCalled();
    });
});

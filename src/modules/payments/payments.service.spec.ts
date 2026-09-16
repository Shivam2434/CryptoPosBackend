// src/modules/payments/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import {
  Payment,
  PaymentStatus,
  CryptoType,
  PaymentEnvironment,
} from './entities/payment.entity';
import { PricingService } from '../pricing/pricing.service';
import { PaymentAddressService } from './address/payment-address.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PaymentsGateway } from './payments.gateway';
import { AuthContext } from '../../common/interfaces/auth-context.interface';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentsRepo: any;
  let pricingService: any;
  let addressService: any;
  let webhooksService: any;
  let gateway: any;
  let configService: any;

  const mockAuth: AuthContext = {
    organizationId: 'org-uuid-1',
    merchantId: 'merchant-uuid-1',
    environment: 'live',
    scopes: ['*'],
    authType: 'jwt',
  };

  beforeEach(async () => {
    paymentsRepo = {
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'payment-uuid-1', ...dto })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      find: jest.fn(),
    };

    pricingService = {
      getExchangeRate: jest.fn().mockResolvedValue(4000), // ETH = 4000 AUD
    };

    addressService = {
      getAddressForPayment: jest.fn().mockResolvedValue({
        address: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
        isDynamic: false,
      }),
    };

    webhooksService = {
      dispatchEvent: jest.fn().mockResolvedValue(undefined),
    };

    gateway = {
      notifyPaymentUpdate: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'pricing.slippagePercent') return 1.0;
        if (key === 'blockchain.paymentTimeoutMinutes') return 15;
        if (key.startsWith('blockchain.confirmationsRequired')) return 2;
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: paymentsRepo },
        { provide: PricingService, useValue: pricingService },
        { provide: PaymentAddressService, useValue: addressService },
        { provide: WebhooksService, useValue: webhooksService },
        { provide: PaymentsGateway, useValue: gateway },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return existing payment if idempotencyKey matches', async () => {
    const existingPayment = {
      id: 'existing-payment-uuid',
      organizationId: mockAuth.organizationId,
      idempotencyKey: 'idemp_unique_key_123',
      audAmount: 20,
      status: PaymentStatus.PENDING,
      paymentAddress: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    };

    paymentsRepo.findOne.mockResolvedValue(existingPayment);

    const result = await service.createPayment(mockAuth, {
      audAmount: 20,
      cryptoType: CryptoType.ETH,
      idempotencyKey: 'idemp_unique_key_123',
    });

    expect(result.id).toBe('existing-payment-uuid');
    expect(pricingService.getExchangeRate).not.toHaveBeenCalled();
  });

  it('should create a new payment with QR code and resolved address when idempotencyKey is new', async () => {
    paymentsRepo.findOne.mockResolvedValue(null);

    const result = await service.createPayment(mockAuth, {
      audAmount: 40,
      cryptoType: CryptoType.ETH,
      idempotencyKey: 'new_idemp_key',
    });

    expect(result.organizationId).toBe(mockAuth.organizationId);
    expect(result.paymentAddress).toBe(
      '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    );
    expect(result.qrCodeData).toContain('data:image/png;base64');
    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(webhooksService.dispatchEvent).toHaveBeenCalledWith(
      mockAuth.organizationId,
      'payment.created',
      expect.anything(),
    );
  });

  it('should preserve receiving address immutability on payment status update', async () => {
    const initialPayment: Payment = {
      id: 'payment-immutability-test',
      organizationId: 'org-uuid-1',
      network: 'mainnet',
      environment: PaymentEnvironment.LIVE,
      audAmount: 50,
      cryptoAmount: 0.0125,
      cryptoType: CryptoType.ETH,
      exchangeRate: 4000,
      paymentAddress: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
      status: PaymentStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: 2,
      expiresAt: new Date(Date.now() + 900000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    paymentsRepo.findOne.mockResolvedValueOnce(initialPayment);

    const updated = await service.updatePaymentStatus(
      'payment-immutability-test',
      PaymentStatus.CONFIRMED,
      { txHash: '0xabc123' },
    );

    expect(updated.paymentAddress).toBe(
      '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    );
    expect(updated.status).toBe(PaymentStatus.CONFIRMED);
    expect(updated.confirmedAt).toBeDefined();
  });
});

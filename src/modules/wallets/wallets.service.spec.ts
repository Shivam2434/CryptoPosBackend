// src/modules/wallets/wallets.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { Wallet, WalletStatus, WalletType } from './entities/wallet.entity';
import { WalletAddressValidatorService } from './validation/wallet-address-validator.service';
import { AuditService } from '../audit/audit.service';

describe('WalletsService', () => {
  let service: WalletsService;
  let mockWalletsRepo: any;
  let mockValidator: any;
  let mockAuditService: any;

  const mockWallet: Wallet = {
    id: 'wallet-uuid-1',
    organizationId: 'org-1',
    merchantId: 'merchant-1',
    address: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    network: 'mainnet',
    asset: 'ETH',
    type: WalletType.EXTERNAL,
    status: WalletStatus.ACTIVE,
    isPrimary: true,
    label: 'Main Store ETH Ledger',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockWalletsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'new-wallet-uuid', ...dto })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockValidator = {
      validateAddress: jest.fn(),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletsService,
        {
          provide: getRepositoryToken(Wallet),
          useValue: mockWalletsRepo,
        },
        {
          provide: WalletAddressValidatorService,
          useValue: mockValidator,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<WalletsService>(WalletsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should validate and register an external receiving address', async () => {
      mockValidator.validateAddress.mockResolvedValueOnce({
        valid: true,
        normalizedAddress: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
        network: 'mainnet',
        asset: 'ETH',
      });

      const result = await service.create('org-1', {
        address: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
        network: 'mainnet',
        asset: 'ETH',
        label: 'Main Ledger',
        isPrimary: true,
      });

      expect(mockValidator.validateAddress).toHaveBeenCalled();
      expect(mockWalletsRepo.update).toHaveBeenCalledWith(
        {
          organizationId: 'org-1',
          asset: 'ETH',
          network: 'mainnet',
          isPrimary: true,
        },
        { isPrimary: false },
      );
      expect(mockWalletsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          type: WalletType.EXTERNAL,
          isPrimary: true,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException if address validation fails', async () => {
      mockValidator.validateAddress.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid address format',
        network: 'mainnet',
        asset: 'ETH',
      });

      await expect(
        service.create('org-1', {
          address: '0xinvalid',
          network: 'mainnet',
          asset: 'ETH',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActiveWallet hierarchy resolution', () => {
    it('should prioritize location primary wallet over org wallet', async () => {
      const locationWallet = { ...mockWallet, locationId: 'loc-1' };
      mockWalletsRepo.findOne.mockResolvedValueOnce(locationWallet);

      const active = await service.findActiveWallet({
        organizationId: 'org-1',
        locationId: 'loc-1',
        asset: 'ETH',
        network: 'mainnet',
      });

      expect(active?.locationId).toBe('loc-1');
    });

    it('should fallback to org primary wallet if location wallet is not configured', async () => {
      mockWalletsRepo.findOne
        .mockResolvedValueOnce(null) // location primary
        .mockResolvedValueOnce(null) // location any
        .mockResolvedValueOnce(mockWallet); // org primary

      const active = await service.findActiveWallet({
        organizationId: 'org-1',
        locationId: 'loc-1',
        asset: 'ETH',
        network: 'mainnet',
      });

      expect(active?.id).toBe(mockWallet.id);
    });
  });

  describe('tenant isolation', () => {
    it('should throw NotFoundException if wallet belongs to another organization', async () => {
      mockWalletsRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('org-2', 'wallet-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete / archive', () => {
    it('should archive wallet and unset primary flag', async () => {
      mockWalletsRepo.findOne.mockResolvedValueOnce(mockWallet);

      const result = await service.delete('org-1', 'wallet-uuid-1');

      expect(result.success).toBe(true);
      expect(mockWalletsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: WalletStatus.ARCHIVED,
          isPrimary: false,
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'wallet.archived' }),
      );
    });
  });
});

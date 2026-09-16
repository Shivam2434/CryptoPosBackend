// src/modules/wallets/wallets.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet, WalletStatus, WalletType } from './entities/wallet.entity';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletFilterDto } from './dto/wallet-filter.dto';
import { ValidateAddressDto } from './dto/validate-address.dto';
import { WalletAddressValidatorService } from './validation/wallet-address-validator.service';
import { AddressValidationResult } from './validation/wallet-address-validator.interface';
import { AuditService } from '../audit/audit.service';
import { AuditActorType } from '../audit/entities/audit-log.entity';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet)
    private walletsRepo: Repository<Wallet>,
    private validator: WalletAddressValidatorService,
    private auditService: AuditService,
  ) {}

  /**
   * Pre-flight address validation without persisting
   */
  async validateAddress(
    dto: ValidateAddressDto,
  ): Promise<AddressValidationResult> {
    return this.validator.validateAddress(dto);
  }

  /**
   * Register a validated external receiving wallet address for the organization
   */
  async create(
    organizationId: string,
    dto: CreateWalletDto,
    actor?: { id?: string; type?: AuditActorType },
  ): Promise<Wallet> {
    // 1. Validate address, network, and asset compatibility
    const validation = await this.validator.validateAddress({
      address: dto.address,
      network: dto.network,
      asset: dto.asset,
    });

    if (!validation.valid) {
      throw new BadRequestException(
        validation.error || 'Invalid receiving wallet address',
      );
    }

    const normalizedAddress =
      validation.normalizedAddress || dto.address.trim();
    const normalizedAsset = dto.asset.toUpperCase();
    const normalizedNetwork = dto.network.toLowerCase();
    const isPrimary = dto.isPrimary !== undefined ? dto.isPrimary : true;

    // 2. If this wallet is marked primary, unset primary flag on existing active wallets for same asset/network
    if (isPrimary) {
      await this.walletsRepo.update(
        {
          organizationId,
          asset: normalizedAsset,
          network: normalizedNetwork,
          isPrimary: true,
        },
        { isPrimary: false },
      );
    }

    // 3. Create wallet record
    const wallet = this.walletsRepo.create({
      organizationId,
      merchantId: dto.merchantId,
      locationId: dto.locationId,
      address: normalizedAddress,
      network: normalizedNetwork,
      asset: normalizedAsset,
      type: dto.type || WalletType.EXTERNAL,
      status: dto.status || WalletStatus.ACTIVE,
      isPrimary,
      label: dto.label,
      metadata: dto.metadata || {},
    });

    const saved = await this.walletsRepo.save(wallet);
    this.logger.log(
      `Registered external receiving wallet ${saved.id} (${saved.asset}/${saved.network}) for Org ${organizationId}`,
    );

    // 4. Audit log (NO private keys or secrets logged)
    this.auditService
      .log({
        organizationId,
        actorType: actor?.type || AuditActorType.USER,
        actorId: actor?.id || 'unknown',
        action: 'wallet.created',
        resourceType: 'wallet',
        resourceId: saved.id,
        details: {
          address: saved.address,
          network: saved.network,
          asset: saved.asset,
          type: saved.type,
          isPrimary: saved.isPrimary,
          label: saved.label,
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to audit log wallet creation: ${err.message}`);
      });

    return saved;
  }

  /**
   * List wallets for an organization with optional filters
   */
  async findByOrganization(
    organizationId: string,
    filter?: WalletFilterDto,
  ): Promise<Wallet[]> {
    const where: any = { organizationId };

    if (filter?.asset) where.asset = filter.asset.toUpperCase();
    if (filter?.network) where.network = filter.network.toLowerCase();
    if (filter?.merchantId) where.merchantId = filter.merchantId;
    if (filter?.locationId) where.locationId = filter.locationId;
    if (filter?.status) where.status = filter.status;
    if (filter?.type) where.type = filter.type;

    return this.walletsRepo.find({
      where,
      order: { isPrimary: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Find single wallet by ID with strict tenant isolation
   */
  async findById(organizationId: string, id: string): Promise<Wallet> {
    const wallet = await this.walletsRepo.findOne({
      where: { id, organizationId },
    });

    if (!wallet) {
      throw new NotFoundException(`Receiving wallet not found with ID: ${id}`);
    }

    return wallet;
  }

  /**
   * Resolve active receiving wallet address for payment generation
   */
  async findActiveWallet(params: {
    organizationId: string;
    asset: string;
    network: string;
    locationId?: string;
    merchantId?: string;
  }): Promise<Wallet | null> {
    const { organizationId, asset, network, locationId, merchantId } = params;
    const normalizedAsset = asset.toUpperCase();
    const normalizedNetwork = network.toLowerCase();

    // 1. Check location-specific primary address
    if (locationId) {
      const locPrimary = await this.walletsRepo.findOne({
        where: {
          organizationId,
          locationId,
          asset: normalizedAsset,
          network: normalizedNetwork,
          status: WalletStatus.ACTIVE,
          isPrimary: true,
        },
      });
      if (locPrimary) return locPrimary;

      const locAny = await this.walletsRepo.findOne({
        where: {
          organizationId,
          locationId,
          asset: normalizedAsset,
          network: normalizedNetwork,
          status: WalletStatus.ACTIVE,
        },
        order: { createdAt: 'DESC' },
      });
      if (locAny) return locAny;
    }

    // 2. Check merchant-specific primary address
    if (merchantId) {
      const merchantPrimary = await this.walletsRepo.findOne({
        where: {
          organizationId,
          merchantId,
          asset: normalizedAsset,
          network: normalizedNetwork,
          status: WalletStatus.ACTIVE,
          isPrimary: true,
        },
      });
      if (merchantPrimary) return merchantPrimary;
    }

    // 3. Check organization-wide primary address
    const orgPrimary = await this.walletsRepo.findOne({
      where: {
        organizationId,
        asset: normalizedAsset,
        network: normalizedNetwork,
        status: WalletStatus.ACTIVE,
        isPrimary: true,
      },
    });
    if (orgPrimary) return orgPrimary;

    // 4. Fallback to any active address for organization + asset + network
    return this.walletsRepo.findOne({
      where: {
        organizationId,
        asset: normalizedAsset,
        network: normalizedNetwork,
        status: WalletStatus.ACTIVE,
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update wallet properties (label, isPrimary, status, metadata)
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateWalletDto,
    actor?: { id?: string; type?: AuditActorType },
  ): Promise<Wallet> {
    const wallet = await this.findById(organizationId, id);
    const oldState = { ...wallet };

    // If setting as primary, unset others for same asset/network
    if (dto.isPrimary === true && !wallet.isPrimary) {
      await this.walletsRepo.update(
        {
          organizationId,
          asset: wallet.asset,
          network: wallet.network,
          isPrimary: true,
        },
        { isPrimary: false },
      );
    }

    Object.assign(wallet, dto);
    const saved = await this.walletsRepo.save(wallet);

    // Audit log
    this.auditService
      .log({
        organizationId,
        actorType: actor?.type || AuditActorType.USER,
        actorId: actor?.id || 'unknown',
        action: 'wallet.updated',
        resourceType: 'wallet',
        resourceId: saved.id,
        details: {
          old: {
            label: oldState.label,
            isPrimary: oldState.isPrimary,
            status: oldState.status,
          },
          new: {
            label: saved.label,
            isPrimary: saved.isPrimary,
            status: saved.status,
          },
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to audit log wallet update: ${err.message}`);
      });

    return saved;
  }

  /**
   * Soft delete / archive a wallet
   */
  async delete(
    organizationId: string,
    id: string,
    actor?: { id?: string; type?: AuditActorType },
  ): Promise<{ success: boolean }> {
    const wallet = await this.findById(organizationId, id);
    wallet.status = WalletStatus.ARCHIVED;
    wallet.isPrimary = false;
    await this.walletsRepo.save(wallet);

    // Audit log
    this.auditService
      .log({
        organizationId,
        actorType: actor?.type || AuditActorType.USER,
        actorId: actor?.id || 'unknown',
        action: 'wallet.archived',
        resourceType: 'wallet',
        resourceId: wallet.id,
        details: {
          address: wallet.address,
          asset: wallet.asset,
          network: wallet.network,
        },
      })
      .catch((err) => {
        this.logger.warn(`Failed to audit log wallet deletion: ${err.message}`);
      });

    return { success: true };
  }
}

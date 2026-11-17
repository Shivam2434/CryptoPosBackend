// src/modules/merchants/merchants.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Merchant, MerchantStatus } from './entities/merchant.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { generateMerchantDisplayCode } from '../../common/utils/display-code.util';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(Merchant)
    private merchantsRepo: Repository<Merchant>,
    private organizationsService: OrganizationsService,
  ) {}

  async create(dto: CreateMerchantDto): Promise<Merchant> {
    const existing = await this.merchantsRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const apiKey = `cpk_${crypto.randomUUID().replace(/-/g, '')}`;

    // Create or attach Organization
    const org = await this.organizationsService.getOrCreateForMerchant({
      id: crypto.randomUUID(),
      businessName: dto.businessName,
      email: dto.email,
      settlementPreference: dto.settlementPreference,
    });

    const merchant = this.merchantsRepo.create({
      ...dto,
      displayCode: await this.allocateDisplayCode(),
      organizationId: org.id,
      password: hashedPassword,
      apiKey,
      status: MerchantStatus.ACTIVE,
    });

    const saved = await this.merchantsRepo.save(merchant);
    delete saved.password;
    return saved;
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    return this.merchantsRepo.findOne({
      where: { email },
      relations: ['organization'],
    });
  }

  async findById(id: string): Promise<Merchant> {
    const merchant = await this.merchantsRepo.findOne({
      where: { id },
      relations: ['organization'],
    });
    if (!merchant) throw new NotFoundException('Merchant not found');
    delete merchant.password;
    return merchant;
  }

  async findByApiKey(apiKey: string): Promise<Merchant | null> {
    return this.merchantsRepo.findOne({
      where: { apiKey },
      relations: ['organization'],
    });
  }

  async findByOrganization(organizationId: string): Promise<Merchant[]> {
    const merchants = await this.merchantsRepo.find({
      where: { organizationId },
    });
    return merchants.map((m) => {
      delete m.password;
      return m;
    });
  }

  async update(id: string, dto: UpdateMerchantDto): Promise<Merchant> {
    const merchant = await this.findById(id);
    Object.assign(merchant, dto);
    const saved = await this.merchantsRepo.save(merchant);
    delete saved.password;
    return saved;
  }

  async save(merchant: Merchant): Promise<Merchant> {
    const saved = await this.merchantsRepo.save(merchant);
    delete saved.password;
    return saved;
  }

  async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    const merchant = await this.findById(id);
    merchant.apiKey = `cpk_${crypto.randomUUID().replace(/-/g, '')}`;
    await this.merchantsRepo.save(merchant);
    return { apiKey: merchant.apiKey };
  }

  async getProfileForAuth(auth: any): Promise<Merchant> {
    if (auth.merchantId) {
      const merchant = await this.merchantsRepo.findOne({
        where: { id: auth.merchantId },
        relations: ['organization'],
      });
      if (merchant) {
        delete merchant.password;
        return this.ensureDisplayCode(merchant);
      }
    }

    if (auth.organizationId) {
      let merchant = await this.merchantsRepo.findOne({
        where: { organizationId: auth.organizationId },
        relations: ['organization'],
      });

      if (!merchant && auth.email) {
        merchant = await this.merchantsRepo.findOne({
          where: { email: auth.email },
          relations: ['organization'],
        });
      }

      if (!merchant) {
        merchant = await this.provisionMerchantForAuth(auth);
      }

      if (merchant) {
        delete merchant.password;
        return this.ensureDisplayCode(merchant);
      }
    }

    if (auth.email) {
      const merchant = await this.merchantsRepo.findOne({
        where: { email: auth.email },
        relations: ['organization'],
      });
      if (merchant) {
        delete merchant.password;
        return this.ensureDisplayCode(merchant);
      }
    }

    throw new NotFoundException(
      'Merchant profile not found for authenticated context',
    );
  }

  private async provisionMerchantForAuth(auth: any): Promise<Merchant | null> {
    const email =
      auth.email &&
      !String(auth.email).includes('@clerk.user') &&
      !String(auth.email).includes('@cryptopos.local') &&
      !String(auth.email).startsWith('merchant_')
        ? auth.email
        : `pending.${String(auth.organizationId || 'store').replace(/-/g, '').slice(0, 8)}@cryptopos.local`;
    const apiKey = `cpk_${crypto.randomUUID().replace(/-/g, '')}`;
    const placeholderPassword = await bcrypt.hash(crypto.randomUUID(), 10);
    const newMerchant = this.merchantsRepo.create({
      displayCode: await this.allocateDisplayCode(),
      organizationId: auth.organizationId,
      email,
      password: placeholderPassword,
      businessName:
        auth.businessName ||
        (auth.name ? `${auth.name}'s Store` : 'CryptoPOS Merchant'),
      contactName: auth.contactName || auth.name || 'Store Owner',
      ethWalletAddress: auth.ethWalletAddress,
      btcWalletAddress: auth.btcWalletAddress,
      status: MerchantStatus.ACTIVE,
      apiKey,
    });

    try {
      const saved = await this.merchantsRepo.save(newMerchant);
      this.logger.log(
        `Provisioned merchant ${saved.id} for org ${auth.organizationId} (${saved.email})`,
      );
      return saved;
    } catch (err: any) {
      this.logger.error(
        `Failed to provision merchant for org ${auth.organizationId}: ${err.message}`,
      );
      if (auth.email) {
        return this.merchantsRepo.findOne({
          where: { email: auth.email },
          relations: ['organization'],
        });
      }
      return this.merchantsRepo.findOne({
        where: { organizationId: auth.organizationId },
        relations: ['organization'],
      });
    }
  }

  private async allocateDisplayCode(): Promise<string> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const displayCode = generateMerchantDisplayCode();
      const taken = await this.merchantsRepo.findOne({ where: { displayCode } });
      if (!taken) return displayCode;
    }
    return generateMerchantDisplayCode(8);
  }

  private async ensureDisplayCode(merchant: Merchant): Promise<Merchant> {
    if (merchant.displayCode) return merchant;
    merchant.displayCode = await this.allocateDisplayCode();
    return this.merchantsRepo.save(merchant);
  }
}

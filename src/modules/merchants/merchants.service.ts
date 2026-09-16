// src/modules/merchants/merchants.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Merchant, MerchantStatus } from './entities/merchant.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class MerchantsService {
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

  async regenerateApiKey(id: string): Promise<{ apiKey: string }> {
    const merchant = await this.findById(id);
    merchant.apiKey = `cpk_${crypto.randomUUID().replace(/-/g, '')}`;
    await this.merchantsRepo.save(merchant);
    return { apiKey: merchant.apiKey };
  }
}

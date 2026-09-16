// src/modules/organizations/organizations.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  OrganizationStatus,
} from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private orgRepo: Repository<Organization>,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    const slug = dto.slug || this.generateSlug(dto.name);
    const existing = await this.orgRepo.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(
        `Organization with slug "${slug}" already exists`,
      );
    }

    const org = this.orgRepo.create({
      ...dto,
      slug,
      status: dto.status || OrganizationStatus.ACTIVE,
      defaultCurrency: dto.defaultCurrency || 'AUD',
      settlementPreference: dto.settlementPreference || 'crypto',
      settings: dto.settings || {},
    });

    return this.orgRepo.save(org);
  }

  async findById(id: string): Promise<Organization> {
    const org = await this.orgRepo.findOne({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization not found with ID: ${id}`);
    }
    return org;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return this.orgRepo.findOne({ where: { slug } });
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findById(id);
    if (dto.slug && dto.slug !== org.slug) {
      const existing = await this.orgRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Slug "${dto.slug}" is already taken`);
      }
    }

    Object.assign(org, dto);
    return this.orgRepo.save(org);
  }

  async getOrCreateForMerchant(merchant: {
    id: string;
    businessName: string;
    email: string;
    settlementPreference?: string;
  }): Promise<Organization> {
    // Look up by slug or create
    const slug = this.generateSlug(
      merchant.businessName || `merchant-${merchant.id.substring(0, 8)}`,
    );
    let org = await this.orgRepo.findOne({ where: { slug } });
    if (!org) {
      org = this.orgRepo.create({
        name: merchant.businessName || 'Default Organization',
        slug,
        status: OrganizationStatus.ACTIVE,
        defaultCurrency: 'AUD',
        settlementPreference: merchant.settlementPreference || 'crypto',
        billingEmail: merchant.email,
        settings: {},
      });
      org = await this.orgRepo.save(org);
    }
    return org;
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `${base || 'org'}-${Math.random().toString(36).substring(2, 7)}`;
  }
}

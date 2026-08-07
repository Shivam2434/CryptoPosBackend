// src/modules/merchants/merchants.service.ts
import {
    Injectable, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { Merchant, MerchantStatus } from './entities/merchant.entity';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantsService {
    constructor(
        @InjectRepository(Merchant)
        private merchantsRepo: Repository<Merchant>,
    ) { }

    async create(dto: CreateMerchantDto): Promise<Merchant> {
        const existing = await this.merchantsRepo.findOne({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Email already registered');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 12);
        const apiKey = `cpk_${uuidv4().replace(/-/g, '')}`;

        const merchant = this.merchantsRepo.create({
            ...dto,
            password: hashedPassword,
            apiKey,
            status: MerchantStatus.ACTIVE, // Auto-approve for MVP
        });

        const saved = await this.merchantsRepo.save(merchant);
        delete saved.password;
        return saved;
    }

    async findByEmail(email: string): Promise<Merchant | null> {
        return this.merchantsRepo.findOne({ where: { email } });
    }

    async findById(id: string): Promise<Merchant> {
        const merchant = await this.merchantsRepo.findOne({ where: { id } });
        if (!merchant) throw new NotFoundException('Merchant not found');
        delete merchant.password;
        return merchant;
    }

    async findByApiKey(apiKey: string): Promise<Merchant | null> {
        return this.merchantsRepo.findOne({ where: { apiKey } });
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
        merchant.apiKey = `cpk_${uuidv4().replace(/-/g, '')}`;
        await this.merchantsRepo.save(merchant);
        return { apiKey: merchant.apiKey };
    }
}
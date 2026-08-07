// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { CreateMerchantDto } from '../merchants/dto/create-merchant.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private merchantsService: MerchantsService,
        private jwtService: JwtService,
    ) { }

    async register(dto: CreateMerchantDto) {
        const merchant = await this.merchantsService.create(dto);
        const token = this.generateToken(merchant.id, merchant.email);
        return {
            merchant,
            accessToken: token,
        };
    }

    async login(dto: LoginDto) {
        const merchant = await this.merchantsService.findByEmail(dto.email);
        if (!merchant) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, merchant.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(merchant.id, merchant.email);
        delete merchant.password;

        return {
            merchant,
            accessToken: token,
        };
    }

    private generateToken(merchantId: string, email: string): string {
        return this.jwtService.sign({
            sub: merchantId,
            email,
        });
    }
}
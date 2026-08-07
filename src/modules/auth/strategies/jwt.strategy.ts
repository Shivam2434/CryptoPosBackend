// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MerchantsService } from '../../merchants/merchants.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private config: ConfigService,
        private merchantsService: MerchantsService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.get<string>('app.jwtSecret'),
        });
    }

    async validate(payload: { sub: string; email: string }) {
        const merchant = await this.merchantsService.findById(payload.sub);
        if (!merchant) {
            throw new UnauthorizedException();
        }
        return { id: merchant.id, email: merchant.email, businessName: merchant.businessName };
    }
}
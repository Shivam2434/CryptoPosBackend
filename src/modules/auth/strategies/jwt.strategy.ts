// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { MerchantsService } from '../../merchants/merchants.service';
import { AuthContext } from '../../../common/interfaces/auth-context.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private config: ConfigService,
    private merchantsService: MerchantsService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('app.jwtSecret') ||
        'crypto-pos-dev-secret-change-in-production-min-32-chars',
    });
  }

  async validate(payload: {
    sub: string;
    email: string;
    orgId?: string;
  }): Promise<AuthContext> {
    const merchant = await this.merchantsService.findById(payload.sub);
    if (!merchant) {
      throw new UnauthorizedException('Merchant not found');
    }

    const orgId = merchant.organizationId || payload.orgId;
    if (!orgId) {
      throw new UnauthorizedException('Organization not assigned to merchant');
    }

    return {
      organizationId: orgId,
      merchantId: merchant.id,
      email: merchant.email,
      businessName: merchant.businessName,
      environment: 'live',
      scopes: ['*'],
      authType: 'jwt',
    };
  }
}

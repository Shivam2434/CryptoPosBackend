// src/common/guards/api-key-auth.guard.ts
import {
    Injectable, CanActivate, ExecutionContext, UnauthorizedException,
} from '@nestjs/common';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { MerchantsService } from '../../modules/merchants/merchants.service';
import { AuthContext } from '../interfaces/auth-context.interface';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    constructor(
        private apiKeysService: ApiKeysService,
        private merchantsService: MerchantsService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKeyHeader = request.headers['x-api-key'] || this.extractBearerKey(request.headers.authorization);

        if (!apiKeyHeader || typeof apiKeyHeader !== 'string') {
            throw new UnauthorizedException('API key is missing in X-Api-Key or Authorization header');
        }

        const rawKey = apiKeyHeader.trim();

        // 1. Check legacy merchant API key prefix: "cpk_"
        if (rawKey.startsWith('cpk_')) {
            const merchant = await this.merchantsService.findByApiKey(rawKey);
            if (!merchant || !merchant.organizationId) {
                throw new UnauthorizedException('Invalid or inactive legacy API key');
            }

            const authContext: AuthContext = {
                organizationId: merchant.organizationId,
                merchantId: merchant.id,
                environment: 'live',
                scopes: ['*'],
                authType: 'api_key',
                businessName: merchant.businessName,
                email: merchant.email,
            };

            request.auth = authContext;
            request.user = authContext;
            return true;
        }

        // 2. Modern API key verification (sk_live_, pk_live_, sk_test_, pk_test_)
        try {
            const keyRecord = await this.apiKeysService.validateApiKey(rawKey);
            const authContext: AuthContext = {
                organizationId: keyRecord.organizationId,
                apiKeyId: keyRecord.id,
                environment: keyRecord.environment,
                scopes: keyRecord.scopes,
                authType: 'api_key',
            };

            request.auth = authContext;
            request.user = authContext;
            return true;
        } catch (error) {
            throw new UnauthorizedException(error.message || 'Invalid API key');
        }
    }

    private extractBearerKey(authHeader?: string): string | null {
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.substring(7).trim();
        if (token.startsWith('sk_') || token.startsWith('pk_') || token.startsWith('cpk_')) {
            return token;
        }
        return null;
    }
}

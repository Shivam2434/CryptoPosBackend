// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { CreateMerchantDto } from '../merchants/dto/create-merchant.dto';
import { LoginDto } from './dto/login.dto';
import { IdentityProviderService } from './identity-provider/identity-provider.service';
import { UsersService } from '../users/users.service';
import { AuthContext, UserRole } from '../../common/interfaces/auth-context.interface';
import { UserStatus } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private identityProviderService: IdentityProviderService,
        private usersService: UsersService,
        private merchantsService: MerchantsService,
        private jwtService: JwtService,
    ) { }

    /**
     * Authenticate an incoming Bearer token from a Third-Party Identity Provider
     * (Auth0, AWS Cognito, Clerk, Supabase, OIDC, or Mock) and resolve/provision the local User record.
     */
    async authenticateBearerToken(token: string, orgHint?: string): Promise<AuthContext> {
        if (!token) {
            throw new UnauthorizedException('Authentication token is required');
        }

        // 1. Try Third-Party Identity Provider verification
        try {
            const identity = await this.identityProviderService.verifyToken(token);
            const user = await this.usersService.findOrCreateFromIdentity(
                {
                    provider: identity.provider,
                    providerUserId: identity.providerUserId,
                    email: identity.email,
                    name: identity.name,
                },
                orgHint,
            );

            if (user.status !== UserStatus.ACTIVE) {
                throw new UnauthorizedException(`User account is ${user.status}`);
            }

            return {
                organizationId: user.organizationId,
                userId: user.id,
                externalIdentityId: user.authProviderUserId,
                authProvider: user.authProvider,
                role: user.role,
                permissions: user.permissions || [],
                email: user.email,
                name: user.name,
                environment: 'live',
                scopes: user.permissions || ['*'],
                authType: 'jwt',
            };
        } catch (idpError) {
            // 2. Fallback: Check if it is a legacy internal JWT token for backward compatibility
            try {
                const legacyPayload = this.jwtService.verify(token);
                if (legacyPayload && legacyPayload.sub) {
                    const merchant = await this.merchantsService.findById(legacyPayload.sub).catch(() => null);
                    if (merchant) {
                        return {
                            organizationId: merchant.organizationId || legacyPayload.orgId,
                            merchantId: merchant.id,
                            email: merchant.email,
                            businessName: merchant.businessName,
                            role: UserRole.OWNER,
                            environment: 'live',
                            scopes: ['*'],
                            authType: 'jwt',
                        };
                    }
                }
            } catch {
                // Not a legacy token either
            }

            this.logger.debug(`Bearer token authentication failed: ${idpError.message}`);
            throw idpError instanceof UnauthorizedException
                ? idpError
                : new UnauthorizedException('Invalid or expired authentication token');
        }
    }

    /**
     * Sync and retrieve user profile after IdP authentication
     */
    async syncUserProfile(token: string, orgHint?: string) {
        const authContext = await this.authenticateBearerToken(token, orgHint);
        if (!authContext.userId) {
            throw new UnauthorizedException('User profile could not be synchronized');
        }
        const user = await this.usersService.findById(authContext.userId);
        return {
            user,
            authContext,
        };
    }

    /**
     * @deprecated Legacy merchant registration endpoint. Use third-party identity provider sign-up.
     */
    async register(dto: CreateMerchantDto) {
        const merchant = await this.merchantsService.create(dto);
        const token = this.generateLegacyToken(merchant.id, merchant.email, merchant.organizationId);
        return {
            merchant,
            accessToken: token,
        };
    }

    /**
     * @deprecated Legacy merchant login endpoint. Use third-party identity provider sign-in.
     */
    async login(dto: LoginDto) {
        const merchant = await this.merchantsService.findByEmail(dto.email);
        if (!merchant || !merchant.password) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(dto.password, merchant.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateLegacyToken(merchant.id, merchant.email, merchant.organizationId);
        delete merchant.password;

        return {
            merchant,
            accessToken: token,
        };
    }

    private generateLegacyToken(merchantId: string, email: string, organizationId?: string): string {
        return this.jwtService.sign({
            sub: merchantId,
            email,
            orgId: organizationId,
        });
    }
}
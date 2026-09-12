// src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { IdentityProviderService } from './identity-provider/identity-provider.service';
import { UsersService } from '../users/users.service';
import { MerchantsService } from '../merchants/merchants.service';
import { User, UserStatus } from '../users/entities/user.entity';
import { UserRole } from '../../common/interfaces/auth-context.interface';

describe('AuthService', () => {
    let service: AuthService;
    let mockIdpService: any;
    let mockUsersService: any;
    let mockMerchantsService: any;
    let mockJwtService: any;

    const mockUser: User = {
        id: 'user-1',
        authProvider: 'oidc',
        authProviderUserId: 'sub_123',
        email: 'merchant@pos.com',
        name: 'Merchant Test',
        organizationId: 'org-1',
        role: UserRole.OWNER,
        permissions: ['*'],
        status: UserStatus.ACTIVE,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        mockIdpService = {
            verifyToken: jest.fn(),
        };

        mockUsersService = {
            findOrCreateFromIdentity: jest.fn(),
            findById: jest.fn(),
        };

        mockMerchantsService = {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            create: jest.fn(),
        };

        mockJwtService = {
            sign: jest.fn().mockReturnValue('mock-signed-jwt'),
            verify: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: IdentityProviderService,
                    useValue: mockIdpService,
                },
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: MerchantsService,
                    useValue: mockMerchantsService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('authenticateBearerToken', () => {
        it('should authenticate third-party IdP token and return AuthContext', async () => {
            mockIdpService.verifyToken.mockResolvedValueOnce({
                provider: 'oidc',
                providerUserId: 'sub_123',
                email: 'merchant@pos.com',
                name: 'Merchant Test',
                roles: ['owner'],
                rawClaims: {},
            });

            mockUsersService.findOrCreateFromIdentity.mockResolvedValueOnce(mockUser);

            const authContext = await service.authenticateBearerToken('idp-valid-token');

            expect(authContext.userId).toBe('user-1');
            expect(authContext.organizationId).toBe('org-1');
            expect(authContext.role).toBe(UserRole.OWNER);
            expect(authContext.email).toBe('merchant@pos.com');
            expect(authContext.authType).toBe('jwt');
        });

        it('should throw UnauthorizedException if user account is suspended', async () => {
            mockIdpService.verifyToken.mockResolvedValueOnce({
                provider: 'oidc',
                providerUserId: 'sub_123',
                email: 'suspended@pos.com',
                roles: ['cashier'],
                rawClaims: {},
            });

            mockUsersService.findOrCreateFromIdentity.mockResolvedValueOnce({
                ...mockUser,
                status: UserStatus.SUSPENDED,
            });

            await expect(service.authenticateBearerToken('idp-token')).rejects.toThrow(
                UnauthorizedException,
            );
        });

        it('should fallback to legacy internal JWT if IdP verification fails', async () => {
            mockIdpService.verifyToken.mockRejectedValueOnce(new Error('Not an IdP token'));
            mockJwtService.verify.mockReturnValueOnce({ sub: 'merchant-1', email: 'legacy@pos.com', orgId: 'org-1' });
            mockMerchantsService.findById.mockResolvedValueOnce({
                id: 'merchant-1',
                email: 'legacy@pos.com',
                businessName: 'Legacy Shop',
                organizationId: 'org-1',
            });

            const authContext = await service.authenticateBearerToken('legacy-token');

            expect(authContext.merchantId).toBe('merchant-1');
            expect(authContext.organizationId).toBe('org-1');
            expect(authContext.email).toBe('legacy@pos.com');
        });
    });

    describe('syncUserProfile', () => {
        it('should return user record and auth context', async () => {
            mockIdpService.verifyToken.mockResolvedValueOnce({
                provider: 'oidc',
                providerUserId: 'sub_123',
                email: 'merchant@pos.com',
            });
            mockUsersService.findOrCreateFromIdentity.mockResolvedValueOnce(mockUser);
            mockUsersService.findById.mockResolvedValueOnce(mockUser);

            const result = await service.syncUserProfile('idp-valid-token');
            expect(result.user).toBeDefined();
            expect(result.authContext.userId).toBe('user-1');
        });
    });
});

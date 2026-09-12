// src/modules/auth/identity-provider/identity-provider.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { IdentityProviderService } from './identity-provider.service';
import { OidcIdentityProviderAdapter } from './adapters/oidc-identity-provider.adapter';
import { MockIdentityProviderAdapter } from './adapters/mock-identity-provider.adapter';

describe('IdentityProviderService', () => {
    let service: IdentityProviderService;
    let configService: ConfigService;
    let mockAdapter: MockIdentityProviderAdapter;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                IdentityProviderService,
                OidcIdentityProviderAdapter,
                MockIdentityProviderAdapter,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'auth.provider') return 'mock';
                            if (key === 'auth.issuerUrl') return 'https://dev-auth.cryptopos.io/';
                            if (key === 'auth.audience') return 'https://api.cryptopos.io';
                            if (key === 'auth.mockSecret') return 'test-mock-secret';
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<IdentityProviderService>(IdentityProviderService);
        configService = module.get<ConfigService>(ConfigService);
        mockAdapter = module.get<MockIdentityProviderAdapter>(MockIdentityProviderAdapter);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should resolve mock adapter when auth.provider is mock', async () => {
        const adapter = service.getActiveAdapter();
        expect(adapter.providerName).toBe('mock');
    });

    it('should verify mock token format "mock_user123_alice@domain.com_admin"', async () => {
        const identity = await service.verifyToken('mock_user123_alice@domain.com_admin');
        expect(identity).toBeDefined();
        expect(identity.provider).toBe('mock');
        expect(identity.providerUserId).toBe('user123');
        expect(identity.email).toBe('alice@domain.com');
        expect(identity.roles).toContain('admin');
    });

    it('should verify mock JWT payload', async () => {
        const payload = {
            sub: 'auth0|usr_98765',
            email: 'bob@example.com',
            name: 'Bob Merchant',
            roles: ['owner'],
            exp: Math.floor(Date.now() / 1000) + 3600,
        };
        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const token = `eyJhbGciOiJub25lIn0.${base64Payload}.signature`;

        const identity = await service.verifyToken(token);
        expect(identity.providerUserId).toBe('auth0|usr_98765');
        expect(identity.email).toBe('bob@example.com');
        expect(identity.name).toBe('Bob Merchant');
        expect(identity.roles).toContain('owner');
    });

    it('should throw UnauthorizedException if empty token is passed', async () => {
        await expect(service.verifyToken('')).rejects.toThrow();
    });
});

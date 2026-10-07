// src/modules/auth/identity-provider/adapters/clerk-identity-provider.adapter.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { ClerkIdentityProviderAdapter } from './clerk-identity-provider.adapter';

describe('ClerkIdentityProviderAdapter', () => {
  let adapter: ClerkIdentityProviderAdapter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClerkIdentityProviderAdapter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'auth.provider') return 'clerk';
              if (key === 'auth.issuerUrl')
                return 'https://distinct-porpoise-1594.clerk.accounts.dev';
              return null;
            }),
          },
        },
      ],
    }).compile();

    adapter = module.get<ClerkIdentityProviderAdapter>(
      ClerkIdentityProviderAdapter,
    );
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
    expect(adapter.providerName).toBe('clerk');
  });

  it('should throw UnauthorizedException if token is empty', async () => {
    await expect(adapter.verifyToken('')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token structure is malformed', async () => {
    await expect(adapter.verifyToken('invalid-token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('should throw UnauthorizedException if token has expired', async () => {
    const expiredPayload = {
      sub: 'user_2xyz123',
      iss: 'https://distinct-porpoise-1594.clerk.accounts.dev',
      exp: Math.floor(Date.now() / 1000) - 300, // expired 5 mins ago
    };
    const header = { alg: 'RS256', typ: 'JWT', kid: 'test-kid' };
    const hB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const pB64 = Buffer.from(JSON.stringify(expiredPayload)).toString(
      'base64url',
    );
    const token = `${hB64}.${pB64}.fake_signature`;

    await expect(adapter.verifyToken(token)).rejects.toThrow(
      'Clerk session token has expired',
    );
  });
});

// src/modules/auth/identity-provider/adapters/mock-identity-provider.adapter.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  IIdentityProvider,
  VerifiedIdentity,
} from '../identity-provider.interface';

@Injectable()
export class MockIdentityProviderAdapter implements IIdentityProvider {
  readonly providerName = 'mock';
  private readonly logger = new Logger(MockIdentityProviderAdapter.name);

  constructor(private configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    return this.resolveIdentity(token);
  }

  async resolveIdentity(token: string): Promise<VerifiedIdentity> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Token is required');
    }

    const trimmed = token.trim();

    // 1. Handle mock shortcut tokens, e.g. "mock_user_123" or "mock:sub:email@domain.com:admin"
    if (trimmed.startsWith('mock_') || trimmed.startsWith('mock:')) {
      const parts = trimmed.split(/[:_]/);
      const sub = parts[1] || 'mock-user-1';
      const email = parts[2]?.includes('@') ? parts[2] : `${sub}@mock.local`;
      const role = parts[3] || 'owner';

      return {
        provider: 'mock',
        providerUserId: sub,
        email,
        name: `Mock User (${sub})`,
        emailVerified: true,
        roles: [role],
        rawClaims: { sub, email, role, mock: true },
      };
    }

    // 2. Handle 3-part JWTs (HMAC or unverified mock)
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64url').toString('utf8'),
        );

        // Optional expiration check if exp present
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowSec) {
          throw new UnauthorizedException('Mock token has expired');
        }

        // If HMAC secret is configured and header specifies HS256, verify signature
        const mockSecret = this.configService.get<string>('auth.mockSecret');
        if (mockSecret) {
          const header = JSON.parse(
            Buffer.from(parts[0], 'base64url').toString('utf8'),
          );
          if (header.alg === 'HS256') {
            const expectedSig = crypto
              .createHmac('sha256', mockSecret)
              .update(`${parts[0]}.${parts[1]}`)
              .digest('base64url');
            if (expectedSig !== parts[2]) {
              throw new UnauthorizedException('Invalid mock token signature');
            }
          }
        }

        const sub = payload.sub || payload.id || 'mock-jwt-sub';
        const email = payload.email || `${sub}@mock.local`;
        const name = payload.name || payload.nickname || 'Mock JWT User';

        return {
          provider: 'mock',
          providerUserId: sub,
          email,
          name,
          emailVerified: payload.email_verified ?? true,
          roles: payload['https://cryptopos.io/roles'] ||
            payload.roles || ['owner'],
          rawClaims: payload,
        };
      } catch (err) {
        if (err instanceof UnauthorizedException) {
          throw err;
        }
        throw new UnauthorizedException(
          `Failed to parse mock JWT payload: ${err.message}`,
        );
      }
    }

    // 3. Handle base64-encoded JSON mock token
    try {
      const decoded = JSON.parse(
        Buffer.from(trimmed, 'base64').toString('utf8'),
      );
      if (decoded.sub || decoded.email) {
        return {
          provider: 'mock',
          providerUserId: decoded.sub || 'mock-base64-sub',
          email: decoded.email || 'mock@local.dev',
          name: decoded.name || 'Mock Base64 User',
          emailVerified: true,
          roles: decoded.roles || ['owner'],
          rawClaims: decoded,
        };
      }
    } catch {
      // Not a base64 JSON token
    }

    throw new UnauthorizedException('Unrecognized mock token format');
  }
}

// src/modules/auth/identity-provider/adapters/clerk-identity-provider.adapter.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import {
  IIdentityProvider,
  VerifiedIdentity,
} from '../identity-provider.interface';

interface JwkKey {
  kty: string;
  kid?: string;
  use?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
  alg?: string;
}

interface ClerkUserProfileCache {
  email: string;
  name?: string;
  cachedAt: number;
}

@Injectable()
export class ClerkIdentityProviderAdapter implements IIdentityProvider {
  readonly providerName = 'clerk';
  private readonly logger = new Logger(ClerkIdentityProviderAdapter.name);

  private jwksCache: Map<string, crypto.KeyObject> = new Map();
  private lastJwksFetch = 0;
  private readonly jwksCacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  private userProfileCache: Map<string, ClerkUserProfileCache> = new Map();
  private readonly userProfileTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private configService: ConfigService) {}

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    return this.resolveIdentity(token);
  }

  async resolveIdentity(token: string): Promise<VerifiedIdentity> {
    if (!token || typeof token !== 'string') {
      throw new UnauthorizedException('Clerk token is required');
    }

    const trimmedToken = token.trim();
    const parts = trimmedToken.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Malformed Clerk JWT token structure');
    }

    let header: any;
    let payload: any;

    try {
      header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid Clerk JWT encoding');
    }

    // 1. Expiration & activation check
    const nowSec = Math.floor(Date.now() / 1000);
    // Allow small clock skew of 60 seconds
    if (payload.exp && payload.exp < nowSec - 60) {
      throw new UnauthorizedException('Clerk session token has expired');
    }

    if (payload.nbf && payload.nbf > nowSec + 60) {
      throw new UnauthorizedException('Clerk session token is not yet active');
    }

    // 2. Issuer check (if configured)
    const expectedIssuer =
      this.configService.get<string>('auth.issuerUrl') ||
      this.configService.get<string>('auth.clerkIssuerUrl');

    if (expectedIssuer && payload.iss) {
      const normalizedExpected = expectedIssuer.replace(/\/$/, '');
      const normalizedActual = payload.iss.replace(/\/$/, '');
      if (normalizedExpected !== normalizedActual) {
        throw new UnauthorizedException(
          `Token issuer mismatch: expected ${expectedIssuer}, got ${payload.iss}`,
        );
      }
    }

    // 3. Cryptographic signature verification via Clerk JWKS
    const isSignatureValid = await this.verifySignatureWithJwks(
      parts[0],
      parts[1],
      parts[2],
      header.kid,
      header.alg,
      payload.iss,
    );

    if (!isSignatureValid) {
      const allowUnsigned =
        process.env.AUTH_ALLOW_UNSIGNED_JWT === 'true' &&
        process.env.NODE_ENV !== 'production';

      if (allowUnsigned) {
        this.logger.warn(
          `⚠️ Clerk signature verification failed. AUTH_ALLOW_UNSIGNED_JWT is set (sub: ${payload.sub})`,
        );
      } else {
        throw new UnauthorizedException(
          'Clerk token signature verification failed',
        );
      }
    }

    // 4. Extract subject claim (check standard sub, user_id, or fallback session identifiers)
    const sub = payload.sub || payload.user_id;
    if (!sub || typeof sub !== 'string' || !sub.startsWith('user_')) {
      this.logger.error(
        `❌ [ClerkAdapter] Clerk token missing user subject. Claims present: ${Object.keys(payload).join(', ')}`,
      );
      throw new UnauthorizedException(
        'Clerk token missing user subject (sub) claim',
      );
    }

    // 5. Extract or resolve user details
    let email =
      payload.email ||
      payload.email_address ||
      payload['https://cryptopos.io/email'];

    let name =
      payload.name ||
      payload.nickname ||
      payload.preferred_username ||
      (payload.first_name
        ? `${payload.first_name} ${payload.last_name || ''}`.trim()
        : undefined);

    // If email is missing from JWT claims, attempt to resolve via Clerk API if secret key is configured
    if (!email && sub.startsWith('user_')) {
      const secretKey =
        this.configService.get<string>('auth.clerkSecretKey') ||
        process.env.CLERK_SECRET_KEY ||
        process.env.AUTH_CLERK_SECRET_KEY;

      if (secretKey) {
        const fetchedProfile = await this.fetchClerkUserProfile(sub, secretKey);
        if (fetchedProfile) {
          email = fetchedProfile.email;
          if (!name && fetchedProfile.name) {
            name = fetchedProfile.name;
          }
        }
      }
    }

    // Fallback email identifier if not present
    if (!email) {
      email = `${sub}@clerk.user`;
    }

    const emailVerified = payload.email_verified ?? true;
    const roles = payload['https://cryptopos.io/roles'] ||
      payload.roles ||
      [];

    return {
      provider: 'clerk',
      providerUserId: sub,
      email,
      name,
      emailVerified,
      roles,
      rawClaims: payload,
    };
  }

  private async fetchClerkUserProfile(
    userId: string,
    secretKey: string,
  ): Promise<{ email: string; name?: string } | null> {
    const cached = this.userProfileCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < this.userProfileTtlMs) {
      return { email: cached.email, name: cached.name };
    }

    try {
      const response = await axios.get(
        `https://api.clerk.com/v1/users/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
          timeout: 5000,
        },
      );

      const data = response.data;
      const primaryEmailId = data.primary_email_address_id;
      const emailObj =
        data.email_addresses?.find((e: any) => e.id === primaryEmailId) ||
        data.email_addresses?.[0];
      const email = emailObj?.email_address;
      const fullName =
        data.first_name || data.last_name
          ? `${data.first_name || ''} ${data.last_name || ''}`.trim()
          : undefined;

      if (email) {
        this.userProfileCache.set(userId, {
          email,
          name: fullName,
          cachedAt: Date.now(),
        });
        return { email, name: fullName };
      }
    } catch (err: any) {
      this.logger.debug(
        `Clerk API user fetch skipped or failed for ${userId}: ${err.message}`,
      );
    }

    return null;
  }

  private async verifySignatureWithJwks(
    headerB64: string,
    payloadB64: string,
    signatureB64: string,
    kid?: string,
    alg = 'RS256',
    issuerFromToken?: string,
  ): Promise<boolean> {
    try {
      const publicKey = await this.getPublicKey(kid, issuerFromToken);
      if (!publicKey) {
        this.logger.warn(
          `No public key found for Clerk kid: ${kid || 'default'}`,
        );
        return false;
      }

      const data = `${headerB64}.${payloadB64}`;
      const signature = Buffer.from(signatureB64, 'base64url');

      const verifier = crypto.createVerify(this.mapAlgorithm(alg));
      verifier.update(data);
      return verifier.verify(publicKey, signature);
    } catch (error: any) {
      this.logger.error(`Clerk signature verification error: ${error.message}`);
      return false;
    }
  }

  private async getPublicKey(
    kid?: string,
    issuerFromToken?: string,
  ): Promise<crypto.KeyObject | null> {
    if (
      this.jwksCache.size === 0 ||
      Date.now() - this.lastJwksFetch > this.jwksCacheTtlMs
    ) {
      await this.refreshJwks(issuerFromToken);
    }

    if (kid && this.jwksCache.has(kid)) {
      return this.jwksCache.get(kid)!;
    }

    if (kid && !this.jwksCache.has(kid)) {
      await this.refreshJwks(issuerFromToken);
      if (this.jwksCache.has(kid)) {
        return this.jwksCache.get(kid)!;
      }
    }

    if (this.jwksCache.size > 0) {
      return this.jwksCache.values().next().value || null;
    }

    return null;
  }

  private async refreshJwks(issuerFromToken?: string): Promise<void> {
    const customJwksUri = this.configService.get<string>('auth.jwksUri');
    const issuerUrl =
      this.configService.get<string>('auth.issuerUrl') || issuerFromToken;

    let jwksUri = customJwksUri;
    if (!jwksUri && issuerUrl) {
      const cleanIssuer = issuerUrl.replace(/\/$/, '');
      jwksUri = `${cleanIssuer}/.well-known/jwks.json`;
    }

    if (!jwksUri) {
      this.logger.debug(
        'No Clerk JWKS URI or issuer URL configured for key retrieval',
      );
      return;
    }

    try {
      const response = await axios.get(jwksUri, { timeout: 8000 });
      const keys: JwkKey[] = response.data?.keys || [];

      this.jwksCache.clear();
      for (const key of keys) {
        try {
          const pubKey = crypto.createPublicKey({
            key: key as any,
            format: 'jwk',
          });
          const keyId = key.kid || 'default';
          this.jwksCache.set(keyId, pubKey);
        } catch (err: any) {
          this.logger.debug(
            `Could not import Clerk JWK ${key.kid}: ${err.message}`,
          );
        }
      }

      this.lastJwksFetch = Date.now();
      this.logger.log(
        `Refreshed Clerk JWKS keys from ${jwksUri} (${this.jwksCache.size} keys imported)`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to fetch Clerk JWKS from ${jwksUri}: ${error.message}`,
      );
    }
  }

  private mapAlgorithm(alg: string): string {
    switch (alg) {
      case 'RS256':
        return 'RSA-SHA256';
      case 'RS384':
        return 'RSA-SHA384';
      case 'RS512':
        return 'RSA-SHA512';
      case 'ES256':
        return 'SHA256';
      case 'ES384':
        return 'SHA384';
      case 'ES512':
        return 'SHA512';
      default:
        return 'RSA-SHA256';
    }
  }
}

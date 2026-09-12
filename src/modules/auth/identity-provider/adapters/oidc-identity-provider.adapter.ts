// src/modules/auth/identity-provider/adapters/oidc-identity-provider.adapter.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';
import { IIdentityProvider, VerifiedIdentity } from '../identity-provider.interface';

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

@Injectable()
export class OidcIdentityProviderAdapter implements IIdentityProvider {
    readonly providerName = 'oidc';
    private readonly logger = new Logger(OidcIdentityProviderAdapter.name);

    private jwksCache: Map<string, crypto.KeyObject> = new Map();
    private lastJwksFetch = 0;
    private readonly jwksCacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours

    constructor(private configService: ConfigService) { }

    async verifyToken(token: string): Promise<VerifiedIdentity> {
        return this.resolveIdentity(token);
    }

    async resolveIdentity(token: string): Promise<VerifiedIdentity> {
        if (!token || typeof token !== 'string') {
            throw new UnauthorizedException('Token is required');
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new UnauthorizedException('Malformed JWT token structure');
        }

        let header: any;
        let payload: any;

        try {
            header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
            payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        } catch (e) {
            throw new UnauthorizedException('Invalid JWT payload encoding');
        }

        // 1. Expiration check
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowSec) {
            throw new UnauthorizedException('Identity provider token has expired');
        }

        if (payload.nbf && payload.nbf > nowSec) {
            throw new UnauthorizedException('Token is not yet active');
        }

        // 2. Issuer check
        const expectedIssuer = this.configService.get<string>('auth.issuerUrl');
        if (expectedIssuer && payload.iss) {
            const normalizedExpected = expectedIssuer.replace(/\/$/, '');
            const normalizedActual = payload.iss.replace(/\/$/, '');
            if (normalizedExpected !== normalizedActual) {
                throw new UnauthorizedException(`Token issuer mismatch: expected ${expectedIssuer}, got ${payload.iss}`);
            }
        }

        // 3. Audience check
        const expectedAudience = this.configService.get<string>('auth.audience');
        if (expectedAudience && payload.aud) {
            const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
            if (!audiences.includes(expectedAudience)) {
                throw new UnauthorizedException(`Token audience mismatch: expected ${expectedAudience}`);
            }
        }

        // 4. Cryptographic signature verification via JWKS
        const isSignatureValid = await this.verifySignatureWithJwks(parts[0], parts[1], parts[2], header.kid, header.alg);
        if (!isSignatureValid) {
            throw new UnauthorizedException('Token cryptographic signature verification failed');
        }

        // 5. Extract standard identity claims
        const sub = payload.sub;
        if (!sub) {
            throw new UnauthorizedException('Token missing subject (sub) claim');
        }

        const email = payload.email || payload[`https://cryptopos.io/email`] || `${sub}@idp.user`;
        const name = payload.name || payload.nickname || payload.preferred_username;
        const emailVerified = payload.email_verified ?? true;
        const providerName = this.configService.get<string>('auth.provider') || 'oidc';

        return {
            provider: providerName,
            providerUserId: sub,
            email,
            name,
            emailVerified,
            roles: payload['https://cryptopos.io/roles'] || payload.roles || [],
            rawClaims: payload,
        };
    }

    private async verifySignatureWithJwks(
        headerB64: string,
        payloadB64: string,
        signatureB64: string,
        kid?: string,
        alg = 'RS256',
    ): Promise<boolean> {
        try {
            const publicKey = await this.getPublicKey(kid);
            if (!publicKey) {
                this.logger.warn(`No public key found for kid: ${kid || 'default'}`);
                return false;
            }

            const data = `${headerB64}.${payloadB64}`;
            const signature = Buffer.from(signatureB64, 'base64url');

            const verifier = crypto.createVerify(this.mapAlgorithm(alg));
            verifier.update(data);
            return verifier.verify(publicKey, signature);
        } catch (error) {
            this.logger.error(`Signature verification error: ${error.message}`);
            return false;
        }
    }

    private async getPublicKey(kid?: string): Promise<crypto.KeyObject | null> {
        // Refresh cache if needed
        if (this.jwksCache.size === 0 || Date.now() - this.lastJwksFetch > this.jwksCacheTtlMs) {
            await this.refreshJwks();
        }

        if (kid && this.jwksCache.has(kid)) {
            return this.jwksCache.get(kid)!;
        }

        // If not found in cache, force refresh once
        if (kid && !this.jwksCache.has(kid)) {
            await this.refreshJwks();
            if (this.jwksCache.has(kid)) {
                return this.jwksCache.get(kid)!;
            }
        }

        // Return first key if only one key available
        if (this.jwksCache.size > 0) {
            return this.jwksCache.values().next().value || null;
        }

        return null;
    }

    private async refreshJwks(): Promise<void> {
        const customJwksUri = this.configService.get<string>('auth.jwksUri');
        const issuerUrl = this.configService.get<string>('auth.issuerUrl');
        const jwksUri = customJwksUri || (issuerUrl ? `${issuerUrl.replace(/\/$/, '')}/.well-known/jwks.json` : null);

        if (!jwksUri) {
            this.logger.debug('No JWKS URI or issuer URL configured for OIDC key retrieval');
            return;
        }

        try {
            const response = await axios.get(jwksUri, { timeout: 8000 });
            const keys: JwkKey[] = response.data?.keys || [];

            this.jwksCache.clear();
            for (const key of keys) {
                try {
                    const pubKey = crypto.createPublicKey({ key: key as any, format: 'jwk' });
                    const keyId = key.kid || 'default';
                    this.jwksCache.set(keyId, pubKey);
                } catch (err) {
                    this.logger.debug(`Could not import JWK ${key.kid}: ${err.message}`);
                }
            }

            this.lastJwksFetch = Date.now();
            this.logger.log(`Refreshed JWKS keys from ${jwksUri} (${this.jwksCache.size} keys imported)`);
        } catch (error) {
            this.logger.warn(`Failed to fetch JWKS from ${jwksUri}: ${error.message}`);
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

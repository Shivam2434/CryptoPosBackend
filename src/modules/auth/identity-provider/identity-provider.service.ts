// src/modules/auth/identity-provider/identity-provider.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IIdentityProvider,
  VerifiedIdentity,
} from './identity-provider.interface';
import { OidcIdentityProviderAdapter } from './adapters/oidc-identity-provider.adapter';
import { MockIdentityProviderAdapter } from './adapters/mock-identity-provider.adapter';

@Injectable()
export class IdentityProviderService {
  private readonly logger = new Logger(IdentityProviderService.name);
  private readonly adapters: Map<string, IIdentityProvider> = new Map();

  constructor(
    private configService: ConfigService,
    private oidcAdapter: OidcIdentityProviderAdapter,
    private mockAdapter: MockIdentityProviderAdapter,
  ) {
    // Register default adapters
    this.registerAdapter('oidc', this.oidcAdapter);
    this.registerAdapter('auth0', this.oidcAdapter);
    this.registerAdapter('cognito', this.oidcAdapter);
    this.registerAdapter('clerk', this.oidcAdapter);
    this.registerAdapter('supabase', this.oidcAdapter);
    this.registerAdapter('mock', this.mockAdapter);
  }

  registerAdapter(name: string, adapter: IIdentityProvider): void {
    this.adapters.set(name.toLowerCase(), adapter);
    this.logger.log(`Registered Identity Provider adapter for '${name}'`);
  }

  getActiveAdapter(): IIdentityProvider {
    const providerName = (
      this.configService.get<string>('auth.provider') || 'oidc'
    ).toLowerCase();
    const adapter = this.adapters.get(providerName);
    if (!adapter) {
      this.logger.warn(
        `No specific adapter found for '${providerName}', falling back to OIDC adapter`,
      );
      return this.oidcAdapter;
    }
    return adapter;
  }

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    if (!token) {
      throw new UnauthorizedException('Authentication token must be provided');
    }

    const adapter = this.getActiveAdapter();
    return adapter.verifyToken(token);
  }
}

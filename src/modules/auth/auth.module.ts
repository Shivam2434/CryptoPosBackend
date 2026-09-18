// src/modules/auth/auth.module.ts
import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MerchantsModule } from '../merchants/merchants.module';
import { UsersModule } from '../users/users.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { DevicesModule } from '../devices/devices.module';
import { IdentityProviderService } from './identity-provider/identity-provider.service';
import { OidcIdentityProviderAdapter } from './identity-provider/adapters/oidc-identity-provider.adapter';
import { MockIdentityProviderAdapter } from './identity-provider/adapters/mock-identity-provider.adapter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ApiKeyAuthGuard } from '../../common/guards/api-key-auth.guard';
import { DeviceAuthGuard } from '../../common/guards/device-auth.guard';
import { CompositeAuthGuard } from '../../common/guards/composite-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';

@Global()
@Module({
  imports: [
    MerchantsModule,
    UsersModule,
    ApiKeysModule,
    DevicesModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret:
          config.get<string>('app.jwtSecret') ||
          'crypto-pos-dev-secret-change-in-production-min-32-chars',
        signOptions: {
          expiresIn: (config.get<string>('app.jwtExpiresIn') || '24h') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    OidcIdentityProviderAdapter,
    MockIdentityProviderAdapter,
    IdentityProviderService,
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyAuthGuard,
    DeviceAuthGuard,
    CompositeAuthGuard,
    PermissionsGuard,
    ScopeGuard,
  ],
  exports: [
    AuthService,
    IdentityProviderService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    ApiKeyAuthGuard,
    DeviceAuthGuard,
    CompositeAuthGuard,
    PermissionsGuard,
    ScopeGuard,
    UsersModule,
  ],
})
export class AuthModule {}

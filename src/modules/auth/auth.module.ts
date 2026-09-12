// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MerchantsModule } from '../merchants/merchants.module';
import { UsersModule } from '../users/users.module';
import { IdentityProviderService } from './identity-provider/identity-provider.service';
import { OidcIdentityProviderAdapter } from './identity-provider/adapters/oidc-identity-provider.adapter';
import { MockIdentityProviderAdapter } from './identity-provider/adapters/mock-identity-provider.adapter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@Module({
    imports: [
        MerchantsModule,
        UsersModule,
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('app.jwtSecret') || 'crypto-pos-dev-secret-change-in-production-min-32-chars',
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
    ],
    exports: [
        AuthService,
        IdentityProviderService,
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        UsersModule,
    ],
})
export class AuthModule { }
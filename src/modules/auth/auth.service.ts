// src/modules/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MerchantsService } from '../merchants/merchants.service';
import { CreateMerchantDto } from '../merchants/dto/create-merchant.dto';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { IdentityProviderService } from './identity-provider/identity-provider.service';
import { UsersService } from '../users/users.service';
import {
  AuthContext,
  UserRole,
} from '../../common/interfaces/auth-context.interface';
import { User, UserStatus } from '../users/entities/user.entity';
import { isPlaceholderEmail, pickRealEmail } from '../../common/utils/email.util';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private identityProviderService: IdentityProviderService,
    private usersService: UsersService,
    private merchantsService: MerchantsService,
    private jwtService: JwtService,
  ) {}

  /**
   * Authenticate an incoming Bearer token from a Third-Party Identity Provider
   * (Auth0, AWS Cognito, Clerk, Supabase, OIDC, or Mock) and resolve/provision the local User record.
   */
  async authenticateBearerToken(
    token: string,
    orgHint?: string,
  ): Promise<AuthContext> {
    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    // 1. Try Third-Party Identity Provider verification
    try {
      this.logger.debug(`🔑 [authenticateBearerToken] Verifying token via IdP (orgHint: ${orgHint || 'none'})`);
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

      if (!user.merchantId && user.organizationId) {
        try {
          const merchant = await this.merchantsService.getProfileForAuth({
            organizationId: user.organizationId,
            email: user.email,
            name: user.name,
            contactName: user.name,
          });
          if (merchant) {
            user.merchantId = merchant.id;
            await this.usersService.saveUser(user);
          }
        } catch (err: any) {
          this.logger.warn(
            `Could not provision merchant during auth for user ${user.id}: ${err.message}`,
          );
        }
      }

      const isSuper = user.role === UserRole.SUPER_ADMIN;
      const isPlatform =
        isSuper || user.isPlatformAdmin || user.role === UserRole.SUB_ADMIN;

      return {
        organizationId: user.organizationId,
        userId: user.id,
        externalIdentityId: user.authProviderUserId,
        authProvider: user.authProvider,
        role: user.role,
        permissions: user.permissions || [],
        isSuperAdmin: isSuper,
        isPlatformAdmin: isPlatform,
        scopeLevel: user.scopeLevel,
        scopedOrganizationIds: user.scopedOrganizationIds || [],
        scopedMerchantIds: user.scopedMerchantIds || [],
        merchantId: user.merchantId,
        email: user.email,
        name: user.name,
        environment: 'live',
        scopes: user.permissions || ['*'],
        authType: 'jwt',
      };
    } catch (idpError) {
      // 2. Fallback: Check if it is a legacy internal JWT token for backward compatibility
      this.logger.warn(`⚠️ [authenticateBearerToken] IdP verification failed: ${idpError.message} — trying legacy JWT fallback`);
      try {
        const legacyPayload = this.jwtService.verify(token);
        if (legacyPayload && legacyPayload.sub) {
          const merchant = await this.merchantsService
            .findById(legacyPayload.sub)
            .catch(() => null);
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

      this.logger.error(
        `❌ [authenticateBearerToken] Both IdP and legacy JWT auth failed: ${idpError.message}`,
      );
      throw idpError instanceof UnauthorizedException
        ? idpError
        : new UnauthorizedException('Invalid or expired authentication token');
    }
  }

  /**
   * Sync and retrieve user profile after IdP authentication
   */
  async syncUserProfile(
    token: string,
    orgHint?: string,
    hintProfile?: {
      email?: string;
      name?: string;
      businessName?: string;
      contactName?: string;
      ethWalletAddress?: string;
      btcWalletAddress?: string;
    },
  ) {
    this.logger.log(
      `🔄 [syncUserProfile] Attempting profile sync. orgHint: ${orgHint || 'none'}, hintEmail: ${hintProfile?.email || 'none'}`,
    );
    const authContext = await this.authenticateBearerToken(token, orgHint);
    if (!authContext.userId) {
      this.logger.warn('⚠️ [syncUserProfile] No userId in authContext after token auth — rejecting.');
      throw new UnauthorizedException('User profile could not be synchronized');
    }
    this.logger.log(`✅ [syncUserProfile] Token verified. userId: ${authContext.userId}, email: ${authContext.email}`);
    const user = await this.usersService.findById(authContext.userId);

    const realEmail = pickRealEmail(hintProfile?.email, authContext.email, user.email);
    if (realEmail && (isPlaceholderEmail(user.email) || user.email.toLowerCase() !== realEmail.toLowerCase())) {
      user.email = realEmail;
      if (hintProfile?.name && !user.name) user.name = hintProfile.name;
      await this.usersService.saveUser(user);
      this.logger.log(`📝 [syncUserProfile] Updated user ${user.id} email to: ${user.email}`);
    } else if (hintProfile?.name && !user.name) {
      user.name = hintProfile.name;
      await this.usersService.saveUser(user);
    }

    const merchantLookup = {
      ...authContext,
      email: realEmail || hintProfile?.email || user.email,
      name: hintProfile?.name || user.name,
      contactName: hintProfile?.contactName || hintProfile?.name || user.name,
      businessName: hintProfile?.businessName,
      ethWalletAddress: hintProfile?.ethWalletAddress,
      btcWalletAddress: hintProfile?.btcWalletAddress,
    };

    let merchant = await this.merchantsService
      .getProfileForAuth(merchantLookup)
      .catch((err) => {
        this.logger.warn(`⚠️ [syncUserProfile] Could not load merchant profile: ${err.message}`);
        return null;
      });

    if (merchant) {
      let updated = false;
      if (
        hintProfile?.businessName &&
        (!merchant.businessName ||
          merchant.businessName === 'CryptoPOS Merchant' ||
          merchant.businessName.includes("'s Organization"))
      ) {
        merchant.businessName = hintProfile.businessName;
        updated = true;
      }
      if (
        hintProfile?.contactName &&
        (!merchant.contactName || merchant.contactName === 'Store Owner')
      ) {
        merchant.contactName = hintProfile.contactName;
        updated = true;
      }
      if (hintProfile?.ethWalletAddress && !merchant.ethWalletAddress) {
        merchant.ethWalletAddress = hintProfile.ethWalletAddress;
        updated = true;
      }
      if (hintProfile?.btcWalletAddress && !merchant.btcWalletAddress) {
        merchant.btcWalletAddress = hintProfile.btcWalletAddress;
        updated = true;
      }
      if (updated) {
        merchant = await this.merchantsService.save(merchant);
        this.logger.log(
          `📝 [syncUserProfile] Updated merchant ${merchant.id} with registration hints: ${merchant.businessName}`,
        );
      }
    }

    if (merchant && !user.merchantId) {
      user.merchantId = merchant.id;
      await this.usersService.saveUser(user);
      this.logger.log(`🔗 [syncUserProfile] Linked user ${user.id} to merchant ${merchant.id}`);
    }

    const isFirstTime =
      !user.metadata?.onboardingCompleted &&
      (!merchant ||
        !merchant.businessName ||
        merchant.businessName === 'CryptoPOS Merchant' ||
        merchant.businessName.includes("'s Organization"));

    this.logger.log(`📊 [syncUserProfile] User: ${user.email} | Merchant: ${merchant?.businessName || 'none'} | onboardingRequired: ${isFirstTime}`);

    return {
      user,
      merchant,
      authContext: {
        ...authContext,
        merchantId: merchant?.id || authContext.merchantId,
      },
      onboardingRequired: isFirstTime,
    };
  }

  /**
   * Complete first-time user and merchant onboarding setup
   */
  async completeOnboarding(auth: AuthContext, dto: OnboardingDto) {
    this.logger.log(`🎓 [completeOnboarding] userId: ${auth.userId}, merchantId: ${auth.merchantId}, businessName: "${dto.businessName}"`);
    if (!dto.ethWalletAddress?.trim() && !dto.btcWalletAddress?.trim()) {
      throw new BadRequestException(
        'Add at least one wallet address to receive payments',
      );
    }
    const merchant = await this.merchantsService.getProfileForAuth({
      ...auth,
      email: pickRealEmail(dto.email, auth.email) || auth.email,
    });
    this.logger.log(`📦 [completeOnboarding] Found merchant: ${merchant.id} (${merchant.businessName})`);
    let updatedMerchant = await this.merchantsService.update(merchant.id, {
      businessName: dto.businessName,
      contactName: dto.contactName,
      contactPhone: dto.contactPhone,
      businessAbn: dto.businessAbn,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      postcode: dto.postcode,
      settlementPreference: dto.settlementPreference,
      ethWalletAddress: dto.ethWalletAddress,
      btcWalletAddress: dto.btcWalletAddress,
      acceptedCryptos: dto.acceptedCryptos,
    });

    const realEmail = pickRealEmail(dto.email, auth.email, updatedMerchant.email);
    if (realEmail && isPlaceholderEmail(updatedMerchant.email)) {
      updatedMerchant.email = realEmail;
      updatedMerchant = await this.merchantsService.save(updatedMerchant);
    }

    let updatedUser: User | null = null;
    if (auth.userId) {
      const user = await this.usersService.findById(auth.userId);
      user.name = dto.contactName;
      user.merchantId = updatedMerchant.id;
      if (realEmail && isPlaceholderEmail(user.email)) {
        user.email = realEmail;
      }
      user.metadata = {
        ...(user.metadata || {}),
        onboardingCompleted: true,
      };
      updatedUser = await this.usersService.saveUser(user);
      this.logger.log(`✅ [completeOnboarding] User ${updatedUser.id} marked onboardingCompleted=true, linked to merchant ${updatedMerchant.id}`);
    }

    this.logger.log(`🏁 [completeOnboarding] Done. Merchant: ${updatedMerchant.businessName} (${updatedMerchant.id})`);
    return {
      user: updatedUser,
      merchant: updatedMerchant,
      authContext: auth,
      onboardingRequired: false,
    };
  }

  /**
   * @deprecated Legacy merchant registration endpoint. Use third-party identity provider sign-up.
   */
  async register(dto: CreateMerchantDto) {
    const merchant = await this.merchantsService.create(dto);
    const token = this.generateLegacyToken(
      merchant.id,
      merchant.email,
      merchant.organizationId,
    );
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

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      merchant.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateLegacyToken(
      merchant.id,
      merchant.email,
      merchant.organizationId,
    );
    delete merchant.password;

    return {
      merchant,
      accessToken: token,
    };
  }

  private generateLegacyToken(
    merchantId: string,
    email: string,
    organizationId?: string,
  ): string {
    return this.jwtService.sign({
      sub: merchantId,
      email,
      orgId: organizationId,
    });
  }
}

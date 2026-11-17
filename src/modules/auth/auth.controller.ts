// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { CreateMerchantDto } from '../merchants/dto/create-merchant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAuth } from '../../common/decorators/current-tenant.decorator';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';
import { UsersService } from '../users/users.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user profile & tenant context',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile and organization details',
  })
  async getProfile(@CurrentAuth() auth: AuthContext) {
    if (auth.userId) {
      const user = await this.usersService.findById(auth.userId);
      return {
        user,
        authContext: auth,
      };
    }
    return {
      authContext: auth,
    };
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sync user profile with IdP after login / sign-up' })
  @ApiResponse({
    status: 200,
    description: 'Synchronized user profile and tenant context',
  })
  async syncProfile(
    @Body()
    body?: {
      email?: string;
      name?: string;
      businessName?: string;
      contactName?: string;
      ethWalletAddress?: string;
      btcWalletAddress?: string;
    },
    @Headers('authorization') authHeader?: string,
    @Headers('x-organization-id') orgHint?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header with Bearer token is required',
      );
    }
    const token = authHeader.substring(7).trim();
    return this.authService.syncUserProfile(token, orgHint, body);
  }

  @Post('onboarding')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete first-time user and merchant onboarding setup',
  })
  @ApiResponse({
    status: 200,
    description: 'Onboarding completed and profile updated successfully',
  })
  async completeOnboarding(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: OnboardingDto,
  ) {
    return this.authService.completeOnboarding(auth, dto);
  }

  /**
   * @deprecated Use third-party Identity Provider (Auth0, Cognito, Clerk, Supabase, OIDC) for user registration.
   */
  @Post('register')
  @ApiOperation({
    summary: '[DEPRECATED] Register a new merchant directly',
    description:
      'Deprecated in favor of third-party identity provider sign up.',
    deprecated: true,
  })
  register(@Body() dto: CreateMerchantDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Password registration is disabled. Use Clerk sign-up.',
      );
    }
    return this.authService.register(dto);
  }

  /**
   * @deprecated Use third-party Identity Provider (Auth0, Cognito, Clerk, Supabase, OIDC) for user authentication.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[DEPRECATED] Login merchant with password',
    description:
      'Deprecated in favor of third-party identity provider Bearer tokens.',
    deprecated: true,
  })
  login(@Body() dto: LoginDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new UnauthorizedException(
        'Password login is disabled. Use Clerk sign-in.',
      );
    }
    return this.authService.login(dto);
  }
}

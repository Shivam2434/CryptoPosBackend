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
    @Headers('authorization') authHeader?: string,
    @Headers('x-organization-id') orgHint?: string,
  ) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Authorization header with Bearer token is required',
      );
    }
    const token = authHeader.substring(7).trim();
    return this.authService.syncUserProfile(token, orgHint);
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
    return this.authService.login(dto);
  }
}

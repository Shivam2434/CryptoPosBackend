// src/modules/wallets/wallets.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { WalletFilterDto } from './dto/wallet-filter.dto';
import { ValidateAddressDto } from './dto/validate-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentAuth,
  CurrentOrg,
} from '../../common/decorators/current-tenant.decorator';
import { UserRole } from '../../common/interfaces/auth-context.interface';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';
import { AuditActorType } from '../audit/entities/audit-log.entity';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pre-flight check if a cryptocurrency receiving address is valid',
  })
  @ApiResponse({ status: 200, description: 'Address validation result' })
  validateAddress(@Body() dto: ValidateAddressDto) {
    return this.walletsService.validateAddress(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Register and activate a validated external receiving wallet address',
  })
  @ApiResponse({
    status: 201,
    description: 'Receiving wallet registered successfully',
  })
  create(
    @CurrentOrg() organizationId: string,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateWalletDto,
  ) {
    return this.walletsService.create(organizationId, dto, {
      id: auth.userId || auth.apiKeyId || 'unknown',
      type:
        auth.authType === 'api_key'
          ? AuditActorType.API_KEY
          : AuditActorType.USER,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all receiving wallet addresses for the organization',
  })
  findAll(
    @CurrentOrg() organizationId: string,
    @Query() filter: WalletFilterDto,
  ) {
    return this.walletsService.findByOrganization(organizationId, filter);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get details of a receiving wallet address' })
  findOne(@CurrentOrg() organizationId: string, @Param('id') id: string) {
    return this.walletsService.findById(organizationId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update receiving wallet properties or primary status',
  })
  update(
    @CurrentOrg() organizationId: string,
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.walletsService.update(organizationId, id, dto, {
      id: auth.userId || auth.apiKeyId || 'unknown',
      type:
        auth.authType === 'api_key'
          ? AuditActorType.API_KEY
          : AuditActorType.USER,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive/deactivate a receiving wallet address' })
  remove(
    @CurrentOrg() organizationId: string,
    @CurrentAuth() auth: AuthContext,
    @Param('id') id: string,
  ) {
    return this.walletsService.delete(organizationId, id, {
      id: auth.userId || auth.apiKeyId || 'unknown',
      type:
        auth.authType === 'api_key'
          ? AuditActorType.API_KEY
          : AuditActorType.USER,
    });
  }
}

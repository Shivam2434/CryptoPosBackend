import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentAuth } from '../../common/decorators/current-tenant.decorator';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';
import { MerchantsService } from './merchants.service';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private merchantsService: MerchantsService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get merchant profile' })
  async getProfile(@CurrentAuth() auth: AuthContext) {
    return this.merchantsService.getProfileForAuth(auth);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update merchant profile' })
  async updateProfile(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: UpdateMerchantDto,
  ) {
    const merchant = await this.merchantsService.getProfileForAuth(auth);
    return this.merchantsService.update(merchant.id, dto);
  }

  @Post('regenerate-api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate API key' })
  async regenerateApiKey(@CurrentAuth() auth: AuthContext) {
    const merchant = await this.merchantsService.getProfileForAuth(auth);
    return this.merchantsService.regenerateApiKey(merchant.id);
  }
}

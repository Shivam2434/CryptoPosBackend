// src/modules/merchants/merchants.controller.ts
import { Controller, Get, Put, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
  getProfile(@CurrentUser('id') merchantId: string) {
    return this.merchantsService.findById(merchantId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update merchant profile' })
  updateProfile(
    @CurrentUser('id') merchantId: string,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantsService.update(merchantId, dto);
  }

  @Post('regenerate-api-key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Regenerate API key' })
  regenerateApiKey(@CurrentUser('id') merchantId: string) {
    return this.merchantsService.regenerateApiKey(merchantId);
  }
}

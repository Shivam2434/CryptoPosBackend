// src/modules/devices/devices.controller.ts
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
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { PairDeviceDto, UpdateDeviceDto } from './dto/pair-device.dto';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
  constructor(private devicesService: DevicesService) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Register a new POS terminal/device and get pairing code',
  })
  register(@CurrentOrg() orgId: string, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(orgId, dto);
  }

  @Post('pair')
  @ApiOperation({
    summary: 'Pair device using pairing code (called by POS terminal device)',
  })
  pair(@Body() dto: PairDeviceDto) {
    return this.devicesService.pair(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all devices registered in the organization' })
  @ApiQuery({ name: 'locationId', required: false })
  findAll(
    @CurrentOrg() orgId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.devicesService.findAll(orgId, locationId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get device details by ID' })
  findById(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.devicesService.findById(orgId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update device metadata and settings' })
  update(
    @CurrentOrg() orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.update(orgId, id, dto);
  }

  @Delete(':id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke device authorization' })
  revoke(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.devicesService.revoke(orgId, id);
  }
}

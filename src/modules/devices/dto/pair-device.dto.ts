// src/modules/devices/dto/pair-device.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PairDeviceDto {
  @ApiProperty({
    example: 'DEV-8F2A-91C0',
    description: 'Pairing code displayed in POS admin',
  })
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @ApiPropertyOptional({
    example: { model: 'Sunmi V2 Pro', serialNumber: 'SN98127391' },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDeviceDto {
  @ApiPropertyOptional({ example: 'Drive-Thru POS Terminal' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'location-uuid-here' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ example: { notes: 'Relocated to drive-thru' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// src/modules/devices/dto/register-device.dto.ts
import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDeviceDto {
    @ApiProperty({ example: 'Front Counter Register 1' })
    @IsString()
    name: string;

    @ApiProperty({ example: 'location-uuid-here' })
    @IsUUID()
    locationId: string;

    @ApiPropertyOptional({ example: { model: 'iPad Air 5th Gen', os: 'iOS 17.4', appVersion: '1.2.0' } })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

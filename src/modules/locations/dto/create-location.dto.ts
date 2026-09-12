// src/modules/locations/dto/create-location.dto.ts
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationStatus } from '../entities/location.entity';

export class CreateLocationDto {
    @ApiProperty({ example: 'Sydney CBD Flagship' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'LOC-SYD-01' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: 'merchant-uuid-if-assigned' })
    @IsOptional()
    @IsString()
    merchantId?: string;

    @ApiPropertyOptional({ example: '100 George St' })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional({ example: 'Sydney' })
    @IsOptional()
    @IsString()
    city?: string;

    @ApiPropertyOptional({ example: 'NSW' })
    @IsOptional()
    @IsString()
    state?: string;

    @ApiPropertyOptional({ example: '2000' })
    @IsOptional()
    @IsString()
    postcode?: string;

    @ApiPropertyOptional({ example: 'Australia/Sydney', default: 'Australia/Sydney' })
    @IsOptional()
    @IsString()
    timezone?: string;

    @ApiPropertyOptional({ enum: LocationStatus, default: LocationStatus.ACTIVE })
    @IsOptional()
    @IsEnum(LocationStatus)
    status?: LocationStatus;

    @ApiPropertyOptional({ example: { storeManager: 'Alice' } })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

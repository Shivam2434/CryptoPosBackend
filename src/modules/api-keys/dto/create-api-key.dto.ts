// src/modules/api-keys/dto/create-api-key.dto.ts
import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiKeyType, ApiKeyEnvironment } from '../entities/api-key.entity';

export class CreateApiKeyDto {
    @ApiProperty({ example: 'Production E-Commerce Backend' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ enum: ApiKeyType, default: ApiKeyType.SECRET })
    @IsOptional()
    @IsEnum(ApiKeyType)
    keyType?: ApiKeyType;

    @ApiPropertyOptional({ enum: ApiKeyEnvironment, default: ApiKeyEnvironment.LIVE })
    @IsOptional()
    @IsEnum(ApiKeyEnvironment)
    environment?: ApiKeyEnvironment;

    @ApiPropertyOptional({ example: ['payments:read', 'payments:write'], default: ['*'] })
    @IsOptional()
    @IsArray()
    scopes?: string[];

    @ApiPropertyOptional({ example: '2027-12-31T23:59:59Z' })
    @IsOptional()
    @IsDateString()
    expiresAt?: string;
}

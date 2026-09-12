// src/modules/organizations/dto/create-organization.dto.ts
import { IsString, IsOptional, IsEnum, IsEmail, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationStatus } from '../entities/organization.entity';

export class CreateOrganizationDto {
    @ApiProperty({ example: 'Sydney Retail Group Pty Ltd' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'sydney-retail-group' })
    @IsOptional()
    @IsString()
    slug?: string;

    @ApiPropertyOptional({ enum: OrganizationStatus, default: OrganizationStatus.ACTIVE })
    @IsOptional()
    @IsEnum(OrganizationStatus)
    status?: OrganizationStatus;

    @ApiPropertyOptional({ example: 'AUD', default: 'AUD' })
    @IsOptional()
    @IsString()
    defaultCurrency?: string;

    @ApiPropertyOptional({ example: 'crypto', enum: ['crypto', 'aud'] })
    @IsOptional()
    @IsString()
    settlementPreference?: string;

    @ApiPropertyOptional({ example: 'billing@sydneyretail.com' })
    @IsOptional()
    @IsEmail()
    billingEmail?: string;

    @ApiPropertyOptional({ example: { autoSettle: true, notificationEmail: 'ops@sydneyretail.com' } })
    @IsOptional()
    @IsObject()
    settings?: Record<string, any>;
}

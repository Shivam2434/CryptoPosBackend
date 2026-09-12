// src/modules/settlements/dto/create-settlement-batch.dto.ts
import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSettlementBatchDto {
    @ApiPropertyOptional({ example: ['uuid-1', 'uuid-2'], description: 'Specific confirmed payment IDs to settle (leave empty to settle all unsettled confirmed payments)' })
    @IsOptional()
    @IsArray()
    paymentIds?: string[];

    @ApiPropertyOptional({ example: 'manual_bank', enum: ['manual_bank', 'mock', 'zepto', 'zai'] })
    @IsOptional()
    @IsString()
    payoutProvider?: string;

    @ApiPropertyOptional({ example: 'location-uuid-here' })
    @IsOptional()
    @IsString()
    locationId?: string;
}

// src/modules/payments/dto/create-payment.dto.ts
import {
    IsNumber, IsEnum, IsOptional, IsString, Min, Max, IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CryptoType } from '../entities/payment.entity';

export class CreatePaymentDto {
    @ApiProperty({ example: 15.50, description: 'Amount in AUD' })
    @IsNumber()
    @Min(0.01)
    @Max(1000000)
    audAmount: number;

    @ApiProperty({ enum: CryptoType, example: CryptoType.ETH })
    @IsEnum(CryptoType)
    cryptoType: CryptoType;

    @ApiPropertyOptional({ example: 'ORDER-001' })
    @IsOptional()
    @IsString()
    orderReference?: string;

    @ApiPropertyOptional({ example: 'Coffee and cake' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'https://merchant.com/webhook' })
    @IsOptional()
    @IsUrl()
    webhookUrl?: string;
}
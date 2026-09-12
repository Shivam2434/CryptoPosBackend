// src/modules/payments/dto/create-payment.dto.ts
import {
    IsNumber, IsEnum, IsOptional, IsString, Min, Max, IsUrl, IsUUID, IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CryptoType, PaymentEnvironment } from '../entities/payment.entity';

export class CreatePaymentDto {
    @ApiProperty({ example: 15.50, description: 'Amount in AUD to charge customer' })
    @IsNumber()
    @Min(0.01)
    @Max(10000000)
    audAmount: number;

    @ApiProperty({ enum: CryptoType, example: CryptoType.ETH })
    @IsEnum(CryptoType)
    cryptoType: CryptoType;

    @ApiPropertyOptional({ example: 'ORDER-001', description: 'Merchant internal invoice or POS order ID' })
    @IsOptional()
    @IsString()
    orderReference?: string;

    @ApiPropertyOptional({ example: 'Coffee and breakfast sandwich' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 'location-uuid-here', description: 'Store location UUID' })
    @IsOptional()
    @IsUUID()
    locationId?: string;

    @ApiPropertyOptional({ example: 'device-uuid-here', description: 'POS Terminal register UUID' })
    @IsOptional()
    @IsUUID()
    deviceId?: string;

    @ApiPropertyOptional({ example: 'shopify_order_98127391' })
    @IsOptional()
    @IsString()
    integrationId?: string;

    @ApiPropertyOptional({ example: 'mainnet', default: 'mainnet' })
    @IsOptional()
    @IsString()
    network?: string;

    @ApiPropertyOptional({ enum: PaymentEnvironment, default: PaymentEnvironment.LIVE })
    @IsOptional()
    @IsEnum(PaymentEnvironment)
    environment?: PaymentEnvironment;

    @ApiPropertyOptional({ example: 'idemp_91a0b3c8...', description: 'Unique idempotency key' })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;

    @ApiPropertyOptional({ example: { customerEmail: 'payer@example.com', taxRate: 0.10 } })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;

    @ApiPropertyOptional({ example: 'https://merchant.com/webhook', description: 'Legacy webhook URL' })
    @IsOptional()
    @IsUrl({ require_tld: false })
    webhookUrl?: string;
}
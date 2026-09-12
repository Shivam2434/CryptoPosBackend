// src/modules/webhooks/dto/create-webhook-endpoint.dto.ts
import { IsUrl, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookEndpointDto {
    @ApiProperty({ example: 'https://api.merchant.com/webhooks/crypto-pos' })
    @IsUrl({ require_tld: false })
    url: string;

    @ApiPropertyOptional({
        example: ['payment.created', 'payment.detected', 'payment.confirming', 'payment.confirmed', 'payment.expired'],
        default: ['*'],
    })
    @IsOptional()
    @IsArray()
    events?: string[];

    @ApiPropertyOptional({ example: 'Production notification listener' })
    @IsOptional()
    @IsString()
    description?: string;
}

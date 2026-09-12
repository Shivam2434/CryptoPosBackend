// src/modules/sandbox/dto/simulate-payment.dto.ts
import { IsUUID, IsEnum, IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../payments/entities/payment.entity';

export class SimulatePaymentTxDto {
    @ApiProperty({ example: 'payment-uuid-here' })
    @IsUUID()
    paymentId: string;

    @ApiProperty({
        enum: [PaymentStatus.DETECTED, PaymentStatus.CONFIRMING, PaymentStatus.CONFIRMED, PaymentStatus.FAILED],
        example: PaymentStatus.CONFIRMED,
    })
    @IsEnum(PaymentStatus)
    status: PaymentStatus;

    @ApiPropertyOptional({ example: 2 })
    @IsOptional()
    @IsNumber()
    confirmations?: number;

    @ApiPropertyOptional({ example: '0xmock9812739182739182379182371982739182739182739182' })
    @IsOptional()
    @IsString()
    txHash?: string;
}

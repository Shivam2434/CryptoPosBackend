// src/modules/wallets/dto/update-wallet.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletStatus } from '../entities/wallet.entity';

export class UpdateWalletDto {
  @ApiPropertyOptional({
    example: 'Updated Cold Storage Label',
    description: 'Updated friendly label',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Set this wallet as primary receiving address for its asset/network',
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    enum: WalletStatus,
    description: 'Active or inactive status',
  })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @ApiPropertyOptional({
    example: { updatedBy: 'admin', reason: 'device rotation' },
    description: 'Metadata updates',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

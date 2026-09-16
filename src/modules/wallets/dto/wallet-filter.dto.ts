// src/modules/wallets/dto/wallet-filter.dto.ts
import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WalletStatus, WalletType } from '../entities/wallet.entity';

export class WalletFilterDto {
  @ApiPropertyOptional({ example: 'ETH' })
  @IsOptional()
  @IsString()
  asset?: string;

  @ApiPropertyOptional({ example: 'mainnet' })
  @IsOptional()
  @IsString()
  network?: string;

  @ApiPropertyOptional({ example: 'merchant-uuid' })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({ example: 'location-uuid' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ enum: WalletStatus })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @ApiPropertyOptional({ enum: WalletType })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;
}

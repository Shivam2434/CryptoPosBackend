// src/modules/wallets/dto/create-wallet.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WalletType, WalletStatus } from '../entities/wallet.entity';

export class CreateWalletDto {
  @ApiProperty({
    example: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    description:
      'Public blockchain receiving address for merchant funds (NO private keys or seed phrases)',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: 'mainnet',
    description: 'Target blockchain network: mainnet, sepolia, testnet',
    default: 'mainnet',
  })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiProperty({
    example: 'ETH',
    description:
      'Cryptocurrency asset symbol: BTC, ETH, USDT, USDC, USDT_ERC20, USDC_ERC20',
  })
  @IsString()
  @IsNotEmpty()
  asset: string;

  @ApiPropertyOptional({
    example: 'merchant-uuid-here',
    description:
      'Optional merchant profile ID associated with this receiving address',
  })
  @IsOptional()
  @IsUUID()
  merchantId?: string;

  @ApiPropertyOptional({
    example: 'location-uuid-here',
    description:
      'Optional store location ID associated with this receiving address',
  })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    example: 'Main Ledger Nano X',
    description: 'Friendly merchant-facing label for this address',
  })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether this address is the default primary receiving address for the asset/network',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    enum: WalletType,
    default: WalletType.EXTERNAL,
    description:
      'Wallet architecture type. MVP only supports EXTERNAL (merchant self-custody)',
  })
  @IsOptional()
  @IsEnum(WalletType)
  type?: WalletType;

  @ApiPropertyOptional({
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(WalletStatus)
  status?: WalletStatus;

  @ApiPropertyOptional({
    example: { hardwareModel: 'Ledger Nano X', custodyType: 'self' },
    description: 'Arbitrary metadata for the receiving wallet',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// src/modules/auth/dto/onboarding.dto.ts
import {
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingDto {
  @ApiProperty({ example: 'Bondi Beach Coffee Roasters', description: 'Name of the cafe, restaurant, or business' })
  @IsString()
  @MinLength(2)
  businessName: string;

  @ApiProperty({ example: 'John Smith', description: 'Full name of the store owner / manager' })
  @IsString()
  @MinLength(2)
  contactName: string;

  @ApiPropertyOptional({ example: '+61412345678', description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '12345678901', description: 'Australian Business Number (optional)' })
  @IsOptional()
  @IsString()
  businessAbn?: string;

  @ApiPropertyOptional({ example: '120 Campbell Parade', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Bondi Beach', description: 'City / Suburb' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NSW', description: 'State' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '2026', description: 'Postcode' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({ enum: ['crypto', 'aud'], example: 'crypto', description: 'Settlement preference' })
  @IsOptional()
  @IsIn(['crypto', 'aud'])
  settlementPreference?: string;

  @ApiPropertyOptional({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68',
    description: 'Ethereum / EVM wallet address for receiving crypto payments',
  })
  @IsOptional()
  @IsString()
  ethWalletAddress?: string;

  @ApiPropertyOptional({
    example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    description: 'Bitcoin wallet address for receiving crypto payments',
  })
  @IsOptional()
  @IsString()
  btcWalletAddress?: string;

  @ApiPropertyOptional({ example: ['ETH', 'BTC', 'USDT', 'USDC'], description: 'Accepted cryptocurrencies' })
  @IsOptional()
  @IsArray()
  acceptedCryptos?: string[];
}

// src/modules/merchants/dto/create-merchant.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsIn,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMerchantDto {
  @ApiProperty({ example: 'merchant@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Sydney Coffee Shop' })
  @IsString()
  businessName: string;

  @ApiPropertyOptional({ example: '12345678901' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'ABN must be 11 digits' })
  businessAbn?: string;

  @ApiProperty({ example: 'John Smith' })
  @IsString()
  contactName: string;

  @ApiPropertyOptional({ example: '+61412345678' })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiPropertyOptional({ example: '123 George St' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Sydney' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'NSW' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: '2000' })
  @IsOptional()
  @IsString()
  postcode?: string;

  @ApiPropertyOptional({
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD68',
  })
  @IsOptional()
  @IsString()
  ethWalletAddress?: string;

  @ApiPropertyOptional({
    example: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  })
  @IsOptional()
  @IsString()
  btcWalletAddress?: string;

  @ApiPropertyOptional({ example: ['ETH', 'BTC', 'USDT'] })
  @IsOptional()
  @IsArray()
  acceptedCryptos?: string[];

  @ApiPropertyOptional({ enum: ['crypto', 'aud'] })
  @IsOptional()
  @IsIn(['crypto', 'aud'])
  settlementPreference?: string;
}

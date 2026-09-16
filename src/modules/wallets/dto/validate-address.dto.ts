// src/modules/wallets/dto/validate-address.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateAddressDto {
  @ApiProperty({
    example: '0x71C568ba74D35b6F35cf91dD174F8B3e35199696',
    description: 'Public blockchain receiving address to validate',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({
    example: 'mainnet',
    description: 'Blockchain network (mainnet, sepolia, testnet)',
    default: 'mainnet',
  })
  @IsString()
  @IsNotEmpty()
  network: string;

  @ApiProperty({
    example: 'ETH',
    description: 'Asset code: BTC, ETH, USDT, USDC, USDT_ERC20, USDC_ERC20',
  })
  @IsString()
  @IsNotEmpty()
  asset: string;
}

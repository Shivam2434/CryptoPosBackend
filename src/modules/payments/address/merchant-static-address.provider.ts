// src/modules/payments/address/merchant-static-address.provider.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import {
  IAddressProvider,
  AddressAllocationRequest,
  AddressAllocationResult,
} from './address-provider.interface';
import { CryptoType } from '../entities/payment.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { MerchantsService } from '../../merchants/merchants.service';

@Injectable()
export class MerchantStaticAddressProvider implements IAddressProvider {
  constructor(private merchantsService: MerchantsService) {}

  supports(cryptoType: CryptoType): boolean {
    return Object.values(CryptoType).includes(cryptoType);
  }

  async allocateAddress(
    request: AddressAllocationRequest,
  ): Promise<AddressAllocationResult> {
    let merchant: Merchant | null = null;
    if (request.merchantId) {
      merchant = await this.merchantsService
        .findById(request.merchantId)
        .catch(() => null);
    }

    if (!merchant) {
      const orgMerchants = await this.merchantsService.findByOrganization(
        request.organizationId,
      );
      merchant = orgMerchants[0] || null;
    }

    if (!merchant) {
      throw new BadRequestException(
        'No merchant profile found for organization to resolve receiving wallet',
      );
    }

    let address: string | undefined;

    switch (request.cryptoType) {
      case CryptoType.ETH:
      case CryptoType.USDT_ERC20:
      case CryptoType.USDC_ERC20:
        address = merchant.ethWalletAddress;
        break;
      case CryptoType.BTC:
        address = merchant.btcWalletAddress;
        break;
    }

    if (!address) {
      throw new BadRequestException(
        `No wallet configured for ${request.cryptoType} under merchant ${merchant.businessName}`,
      );
    }

    return {
      address,
      isDynamic: false,
    };
  }
}

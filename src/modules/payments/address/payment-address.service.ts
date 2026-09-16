// src/modules/payments/address/payment-address.service.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  AddressAllocationRequest,
  AddressAllocationResult,
  IAddressProvider,
} from './address-provider.interface';
import { ExternalWalletAddressProvider } from './external-wallet-address.provider';
import { MerchantStaticAddressProvider } from './merchant-static-address.provider';
import { PoolAddressProvider } from './pool-address.provider';

@Injectable()
export class PaymentAddressService {
  private readonly logger = new Logger(PaymentAddressService.name);
  private providers: IAddressProvider[];

  constructor(
    private externalWalletProvider: ExternalWalletAddressProvider,
    private poolProvider: PoolAddressProvider,
    private staticProvider: MerchantStaticAddressProvider,
  ) {
    // Provider resolution hierarchy:
    // 1. ExternalWalletAddressProvider (dedicated wallets table)
    // 2. PoolAddressProvider (future dynamic pools)
    // 3. MerchantStaticAddressProvider (legacy merchant entity static fields)
    this.providers = [
      this.externalWalletProvider,
      this.poolProvider,
      this.staticProvider,
    ];
  }

  async getAddressForPayment(
    request: AddressAllocationRequest,
  ): Promise<AddressAllocationResult> {
    for (const provider of this.providers) {
      if (provider.supports(request.cryptoType)) {
        try {
          return await provider.allocateAddress(request);
        } catch (err) {
          this.logger.debug(
            `Provider ${provider.constructor.name} could not allocate address: ${err.message}. Trying next provider.`,
          );
        }
      }
    }

    // Final fallback to static merchant address provider
    return this.staticProvider.allocateAddress(request);
  }
}

// src/modules/payments/address/pool-address.provider.ts
import { Injectable } from '@nestjs/common';
import {
  IAddressProvider,
  AddressAllocationRequest,
  AddressAllocationResult,
} from './address-provider.interface';
import { CryptoType } from '../entities/payment.entity';

@Injectable()
export class PoolAddressProvider implements IAddressProvider {
  supports(_cryptoType: CryptoType): boolean {
    // Ready for dynamic pooled addresses without storing server private keys
    return false;
  }

  async allocateAddress(
    _request: AddressAllocationRequest,
  ): Promise<AddressAllocationResult> {
    throw new Error(
      'Pool address provider is not configured. Defaulting to merchant wallet.',
    );
  }
}

// src/modules/payments/address/address-provider.interface.ts
import { CryptoType } from '../entities/payment.entity';

export interface AddressAllocationRequest {
    organizationId: string;
    merchantId?: string;
    cryptoType: CryptoType;
    network?: string;
    orderReference?: string;
}

export interface AddressAllocationResult {
    address: string;
    memoOrTag?: string;
    derivationPath?: string;
    isDynamic: boolean;
}

export interface IAddressProvider {
    supports(cryptoType: CryptoType): boolean;
    allocateAddress(request: AddressAllocationRequest): Promise<AddressAllocationResult>;
}

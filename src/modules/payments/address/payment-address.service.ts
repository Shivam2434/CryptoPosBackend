// src/modules/payments/address/payment-address.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AddressAllocationRequest, AddressAllocationResult, IAddressProvider } from './address-provider.interface';
import { MerchantStaticAddressProvider } from './merchant-static-address.provider';
import { PoolAddressProvider } from './pool-address.provider';

@Injectable()
export class PaymentAddressService {
    private readonly logger = new Logger(PaymentAddressService.name);
    private providers: IAddressProvider[];

    constructor(
        private staticProvider: MerchantStaticAddressProvider,
        private poolProvider: PoolAddressProvider,
    ) {
        this.providers = [this.poolProvider, this.staticProvider];
    }

    async getAddressForPayment(request: AddressAllocationRequest): Promise<AddressAllocationResult> {
        for (const provider of this.providers) {
            if (provider.supports(request.cryptoType)) {
                try {
                    return await provider.allocateAddress(request);
                } catch (err) {
                    this.logger.warn(`Provider ${provider.constructor.name} failed: ${err.message}. Trying next provider.`);
                }
            }
        }

        // Default fallback to static merchant address
        return this.staticProvider.allocateAddress(request);
    }
}

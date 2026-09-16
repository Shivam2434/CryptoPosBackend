// src/modules/payments/address/external-wallet-address.provider.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  IAddressProvider,
  AddressAllocationRequest,
  AddressAllocationResult,
} from './address-provider.interface';
import { CryptoType } from '../entities/payment.entity';
import { WalletsService } from '../../wallets/wallets.service';

@Injectable()
export class ExternalWalletAddressProvider implements IAddressProvider {
  private readonly logger = new Logger(ExternalWalletAddressProvider.name);

  constructor(private walletsService: WalletsService) {}

  supports(cryptoType: CryptoType): boolean {
    return Object.values(CryptoType).includes(cryptoType);
  }

  async allocateAddress(
    request: AddressAllocationRequest,
  ): Promise<AddressAllocationResult> {
    const wallet = await this.walletsService.findActiveWallet({
      organizationId: request.organizationId,
      locationId: request.locationId,
      merchantId: request.merchantId,
      asset: request.cryptoType,
      network: request.network || 'mainnet',
    });

    if (!wallet || !wallet.address) {
      throw new BadRequestException(
        `No active receiving wallet configured for ${request.cryptoType} on ${request.network || 'mainnet'}`,
      );
    }

    this.logger.debug(
      `Resolved receiving wallet ${wallet.id} (${wallet.address}) for payment (Asset: ${request.cryptoType}, Network: ${request.network || 'mainnet'})`,
    );

    return {
      address: wallet.address,
      isDynamic: false,
    };
  }
}

// src/modules/wallets/validation/wallet-address-validator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import {
  IWalletAddressValidator,
  AddressValidationRequest,
  AddressValidationResult,
} from './wallet-address-validator.interface';

const EVM_ASSETS = ['ETH', 'USDT', 'USDC', 'USDT_ERC20', 'USDC_ERC20'];
const BTC_ASSETS = ['BTC', 'BITCOIN'];

const EVM_NETWORKS = [
  'mainnet',
  'sepolia',
  'ethereum',
  'eth-mainnet',
  'eth-sepolia',
];
const BTC_NETWORKS = [
  'mainnet',
  'testnet',
  'regtest',
  'bitcoin-mainnet',
  'bitcoin-testnet',
];

@Injectable()
export class WalletAddressValidatorService implements IWalletAddressValidator {
  private readonly logger = new Logger(WalletAddressValidatorService.name);

  async validateAddress(
    request: AddressValidationRequest,
  ): Promise<AddressValidationResult> {
    const { address, network, asset } = request;

    if (!address || typeof address !== 'string' || address.trim() === '') {
      return {
        valid: false,
        network,
        asset,
        error: 'Address string must be provided and non-empty',
      };
    }

    const trimmedAddress = address.trim();
    const normalizedAsset = asset?.toUpperCase();
    const normalizedNetwork = network?.toLowerCase() || 'mainnet';

    // 1. Route by asset family
    if (EVM_ASSETS.includes(normalizedAsset)) {
      return this.validateEvmAddress(
        trimmedAddress,
        normalizedNetwork,
        normalizedAsset,
      );
    }

    if (BTC_ASSETS.includes(normalizedAsset)) {
      return this.validateBtcAddress(
        trimmedAddress,
        normalizedNetwork,
        normalizedAsset,
      );
    }

    return {
      valid: false,
      network: normalizedNetwork,
      asset: normalizedAsset,
      error: `Unsupported asset '${asset}'. Supported assets: ETH, BTC, USDT, USDC`,
    };
  }

  private validateEvmAddress(
    address: string,
    network: string,
    asset: string,
  ): AddressValidationResult {
    // Check network compatibility
    if (!EVM_NETWORKS.includes(network)) {
      return {
        valid: false,
        network,
        asset,
        error: `Asset ${asset} is not supported on network '${network}'. Supported EVM networks: ${EVM_NETWORKS.join(', ')}`,
      };
    }

    // Basic EVM address validation via ethers.isAddress (allowing lowercase or loose hex)
    const isStrict = ethers.isAddress(address);
    const isLoose = ethers.isAddress(address.toLowerCase());

    if (!isStrict && !isLoose) {
      return {
        valid: false,
        network,
        asset,
        error: `Invalid Ethereum/ERC-20 address format: '${address}'`,
      };
    }

    try {
      const checksummedAddress = ethers.getAddress(address.toLowerCase());
      return {
        valid: true,
        network,
        asset,
        normalizedAddress: checksummedAddress,
        details: {
          format: 'eip55_hex',
          isChecksummed: checksummedAddress === address,
        },
      };
    } catch (err) {
      return {
        valid: false,
        network,
        asset,
        error: `Failed to normalize Ethereum address: ${err.message}`,
      };
    }
  }

  private validateBtcAddress(
    address: string,
    network: string,
    asset: string,
  ): AddressValidationResult {
    // Check network compatibility
    if (!BTC_NETWORKS.includes(network)) {
      return {
        valid: false,
        network,
        asset,
        error: `Asset ${asset} is not supported on network '${network}'. Supported Bitcoin networks: ${BTC_NETWORKS.join(', ')}`,
      };
    }

    // Detect if user passed an Ethereum hex address for Bitcoin
    if (address.startsWith('0x') || ethers.isAddress(address.toLowerCase())) {
      return {
        valid: false,
        network,
        asset,
        error: `Address is an Ethereum hex address, but asset is Bitcoin (${asset})`,
      };
    }

    const isTestnet =
      network === 'testnet' ||
      network === 'bitcoin-testnet' ||
      network === 'regtest';
    const btcNetwork = isTestnet
      ? bitcoin.networks.testnet
      : bitcoin.networks.bitcoin;

    try {
      bitcoin.address.toOutputScript(address, btcNetwork);

      // Determine address type
      let format = 'legacy_p2pkh';
      if (address.startsWith('bc1') || address.startsWith('tb1')) {
        format = 'bech32';
      } else if (address.startsWith('3') || address.startsWith('2')) {
        format = 'p2sh';
      }

      return {
        valid: true,
        network,
        asset,
        normalizedAddress: address,
        details: {
          format,
        },
      };
    } catch (err) {
      return {
        valid: false,
        network,
        asset,
        error: `Invalid Bitcoin address for network '${network}': ${err.message}`,
      };
    }
  }
}

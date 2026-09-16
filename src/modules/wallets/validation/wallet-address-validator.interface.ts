// src/modules/wallets/validation/wallet-address-validator.interface.ts

export interface AddressValidationRequest {
  address: string;
  network: string; // e.g. 'mainnet', 'sepolia', 'testnet'
  asset: string; // e.g. 'BTC', 'ETH', 'USDT', 'USDC', 'USDT_ERC20', 'USDC_ERC20'
}

export interface AddressValidationResult {
  valid: boolean;
  network: string;
  asset: string;
  normalizedAddress?: string;
  error?: string;
  details?: {
    format?: string; // e.g. 'bech32', 'p2pkh', 'p2sh', 'eip55_hex'
    isChecksummed?: boolean;
  };
}

export interface IWalletAddressValidator {
  validateAddress(
    request: AddressValidationRequest,
  ): Promise<AddressValidationResult>;
}

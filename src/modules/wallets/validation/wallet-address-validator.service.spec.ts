// src/modules/wallets/validation/wallet-address-validator.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { WalletAddressValidatorService } from './wallet-address-validator.service';

describe('WalletAddressValidatorService', () => {
  let service: WalletAddressValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WalletAddressValidatorService],
    }).compile();

    service = module.get<WalletAddressValidatorService>(
      WalletAddressValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Ethereum & ERC-20 Validation', () => {
    const validEthChecksumAddress =
      '0x71c568Ba74d35B6f35cf91DD174F8b3E35199696';
    const lowercaseEthAddress = '0x71c568ba74d35b6f35cf91dd174f8b3e35199696';

    it('should validate and normalize a valid checksummed Ethereum address', async () => {
      const result = await service.validateAddress({
        address: validEthChecksumAddress,
        network: 'mainnet',
        asset: 'ETH',
      });

      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(validEthChecksumAddress);
      expect(result.details?.format).toBe('eip55_hex');
      expect(result.details?.isChecksummed).toBe(true);
    });

    it('should validate and checksum a lowercase Ethereum address', async () => {
      const result = await service.validateAddress({
        address: lowercaseEthAddress,
        network: 'mainnet',
        asset: 'ETH',
      });

      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(validEthChecksumAddress);
    });

    it('should validate ERC-20 tokens (USDT, USDC) on Ethereum Mainnet & Sepolia', async () => {
      const usdtResult = await service.validateAddress({
        address: validEthChecksumAddress,
        network: 'mainnet',
        asset: 'USDT_ERC20',
      });
      expect(usdtResult.valid).toBe(true);

      const usdcResult = await service.validateAddress({
        address: validEthChecksumAddress,
        network: 'sepolia',
        asset: 'USDC',
      });
      expect(usdcResult.valid).toBe(true);
    });

    it('should reject invalid Ethereum hex format', async () => {
      const result = await service.validateAddress({
        address: '0xinvalidEthereumAddressFormat123',
        network: 'mainnet',
        asset: 'ETH',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Ethereum/ERC-20 address format');
    });
  });

  describe('Bitcoin Validation', () => {
    // Valid mainnet addresses
    const validBtcBech32 = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';
    const validBtcP2pkh = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    const validBtcP2sh = '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy';

    // Valid testnet address
    const validBtcTestnetBech32 = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';

    it('should validate Bitcoin Bech32 native segwit address on Mainnet', async () => {
      const result = await service.validateAddress({
        address: validBtcBech32,
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(true);
      expect(result.normalizedAddress).toBe(validBtcBech32);
      expect(result.details?.format).toBe('bech32');
    });

    it('should validate Bitcoin P2PKH legacy address on Mainnet', async () => {
      const result = await service.validateAddress({
        address: validBtcP2pkh,
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(true);
      expect(result.details?.format).toBe('legacy_p2pkh');
    });

    it('should validate Bitcoin P2SH address on Mainnet', async () => {
      const result = await service.validateAddress({
        address: validBtcP2sh,
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(true);
      expect(result.details?.format).toBe('p2sh');
    });

    it('should validate Bitcoin Testnet address on testnet network', async () => {
      const result = await service.validateAddress({
        address: validBtcTestnetBech32,
        network: 'testnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(true);
      expect(result.details?.format).toBe('bech32');
    });

    it('should reject testnet Bitcoin address on mainnet network', async () => {
      const result = await service.validateAddress({
        address: validBtcTestnetBech32,
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Bitcoin address');
    });

    it('should reject malformed Bitcoin address', async () => {
      const result = await service.validateAddress({
        address: '1InvalidBtcAddressLength00000000000',
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(false);
    });
  });

  describe('Cross-Chain & Network Mismatches', () => {
    it('should reject Ethereum hex address supplied for Bitcoin asset', async () => {
      const result = await service.validateAddress({
        address: '0x71c568Ba74d35B6f35cf91DD174F8b3E35199696',
        network: 'mainnet',
        asset: 'BTC',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain(
        'Ethereum hex address, but asset is Bitcoin',
      );
    });

    it('should reject Bitcoin address supplied for Ethereum asset', async () => {
      const result = await service.validateAddress({
        address: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
        network: 'mainnet',
        asset: 'ETH',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Ethereum/ERC-20 address format');
    });

    it('should reject unsupported asset', async () => {
      const result = await service.validateAddress({
        address: '0x71c568Ba74d35B6f35cf91DD174F8b3E35199696',
        network: 'mainnet',
        asset: 'DOGE',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported asset');
    });

    it('should reject EVM asset on Bitcoin network', async () => {
      const result = await service.validateAddress({
        address: '0x71c568Ba74d35B6f35cf91DD174F8b3E35199696',
        network: 'testnet', // testnet is in BTC_NETWORKS
        asset: 'ETH',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not supported on network');
    });
  });
});

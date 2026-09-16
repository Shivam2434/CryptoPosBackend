// src/modules/blockchain/providers/base-blockchain.provider.ts
export interface BlockchainTransaction {
  hash: string;
  from: string;
  to: string;
  amount: number; // In native units (ETH, BTC) or token units (USDT, USDC)
  confirmations: number;
  blockNumber?: number;
  timestamp?: number;
}

export abstract class BaseBlockchainProvider {
  abstract getBalance(address: string, network?: string): Promise<number>;
  abstract getTransaction(
    txHash: string,
    network?: string,
  ): Promise<BlockchainTransaction | null>;
  abstract getTransactionsForAddress(
    address: string,
    sinceBlockOrTimestamp?: number,
    network?: string,
  ): Promise<BlockchainTransaction[]>;
  abstract getCurrentBlockNumber(network?: string): Promise<number>;
  abstract getConfirmations(txHash: string, network?: string): Promise<number>;
}

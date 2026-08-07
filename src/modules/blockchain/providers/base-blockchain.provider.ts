// src/modules/blockchain/providers/base-blockchain.provider.ts
export interface BlockchainTransaction {
    hash: string;
    from: string;
    to: string;
    amount: number;        // In native units (ETH, BTC)
    confirmations: number;
    blockNumber?: number;
    timestamp?: number;
}

export abstract class BaseBlockchainProvider {
    abstract getBalance(address: string): Promise<number>;
    abstract getTransaction(txHash: string): Promise<BlockchainTransaction | null>;
    abstract getTransactionsForAddress(
        address: string,
        sinceTimestamp?: number,
    ): Promise<BlockchainTransaction[]>;
    abstract getCurrentBlockNumber(): Promise<number>;
    abstract getConfirmations(txHash: string): Promise<number>;
}
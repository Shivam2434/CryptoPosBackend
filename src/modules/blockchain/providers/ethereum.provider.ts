// src/modules/blockchain/providers/ethereum.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import {
    BaseBlockchainProvider,
    BlockchainTransaction,
} from './base-blockchain.provider';

@Injectable()
export class EthereumProvider extends BaseBlockchainProvider {
    private readonly logger = new Logger(EthereumProvider.name);
    private provider: ethers.JsonRpcProvider;

    constructor(private configService: ConfigService) {
        super();
        const rpcUrl = configService.get<string>('blockchain.ethereum.rpcUrl');
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.logger.log(`Ethereum provider initialized: ${rpcUrl}`);
    }

    async getBalance(address: string): Promise<number> {
        const balance = await this.provider.getBalance(address);
        return parseFloat(ethers.formatEther(balance));
    }

    async getTransaction(
        txHash: string,
    ): Promise<BlockchainTransaction | null> {
        try {
            const tx = await this.provider.getTransaction(txHash);
            if (!tx) return null;

            const receipt = await this.provider.getTransactionReceipt(txHash);
            const currentBlock = await this.provider.getBlockNumber();

            return {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                amount: parseFloat(ethers.formatEther(tx.value)),
                confirmations: receipt
                    ? currentBlock - receipt.blockNumber + 1
                    : 0,
                blockNumber: receipt?.blockNumber,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get ETH transaction ${txHash}: ${error.message}`,
            );
            return null;
        }
    }

    async getTransactionsForAddress(
        address: string,
        sinceBlock?: number,
    ): Promise<BlockchainTransaction[]> {
        // For MVP, use Etherscan/Alchemy API for historical transactions
        // The provider doesn't natively support address transaction listing
        // This is a simplified version using block scanning
        try {
            const currentBlock = await this.provider.getBlockNumber();
            const fromBlock = sinceBlock || currentBlock - 100; // Last ~100 blocks

            // Use etherscan API or Alchemy enhanced API for production
            const apiKey = this.configService.get<string>(
                'blockchain.ethereum.apiKey',
            );
            const response = await fetch(
                `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${fromBlock}&endblock=latest&sort=desc&apikey=${apiKey}`,
            );
            const data = await response.json();

            if (data.status !== '1' || !data.result) return [];

            return data.result.map((tx: any) => ({
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                amount: parseFloat(ethers.formatEther(tx.value)),
                confirmations: currentBlock - parseInt(tx.blockNumber) + 1,
                blockNumber: parseInt(tx.blockNumber),
                timestamp: parseInt(tx.timeStamp),
            }));
        } catch (error) {
            this.logger.error(
                `Failed to get transactions for ${address}: ${error.message}`,
            );
            return [];
        }
    }

    async getCurrentBlockNumber(): Promise<number> {
        return this.provider.getBlockNumber();
    }

    async getConfirmations(txHash: string): Promise<number> {
        const tx = await this.getTransaction(txHash);
        return tx?.confirmations || 0;
    }

    // Subscribe to new pending transactions for an address
    async watchAddress(
        address: string,
        callback: (tx: BlockchainTransaction) => void,
    ): Promise<void> {
        this.provider.on('block', async (blockNumber) => {
            try {
                const block = await this.provider.getBlock(blockNumber, true);
                if (!block || !block.transactions) return;

                for (const txHash of block.transactions) {
                    const tx = await this.provider.getTransaction(txHash as string);
                    if (
                        tx &&
                        tx.to?.toLowerCase() === address.toLowerCase()
                    ) {
                        callback({
                            hash: tx.hash,
                            from: tx.from,
                            to: tx.to,
                            amount: parseFloat(ethers.formatEther(tx.value)),
                            confirmations: 0,
                            blockNumber,
                        });
                    }
                }
            } catch (error) {
                this.logger.error(
                    `Error watching block ${blockNumber}: ${error.message}`,
                );
            }
        });
    }
}
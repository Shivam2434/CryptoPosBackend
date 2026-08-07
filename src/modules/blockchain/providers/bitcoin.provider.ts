// src/modules/blockchain/providers/bitcoin.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
    BaseBlockchainProvider,
    BlockchainTransaction,
} from './base-blockchain.provider';

@Injectable()
export class BitcoinProvider extends BaseBlockchainProvider {
    private readonly logger = new Logger(BitcoinProvider.name);
    private readonly apiUrl: string;

    constructor(private configService: ConfigService) {
        super();
        this.apiUrl = configService.get<string>('blockchain.bitcoin.apiUrl');
    }

    async getBalance(address: string): Promise<number> {
        const response = await axios.get(
            `${this.apiUrl}/address/${address}`,
        );
        const stats = response.data.chain_stats;
        const satoshis =
            stats.funded_txo_sum - stats.spent_txo_sum;
        return satoshis / 1e8;
    }

    async getTransaction(
        txHash: string,
    ): Promise<BlockchainTransaction | null> {
        try {
            const response = await axios.get(
                `${this.apiUrl}/tx/${txHash}`,
            );
            const tx = response.data;
            const currentHeight = await this.getCurrentBlockNumber();

            const totalOutput = tx.vout.reduce(
                (sum: number, output: any) => sum + output.value,
                0,
            );

            return {
                hash: tx.txid,
                from: tx.vin[0]?.prevout?.scriptpubkey_address || 'unknown',
                to:
                    tx.vout[0]?.scriptpubkey_address || 'unknown',
                amount: totalOutput / 1e8,
                confirmations: tx.status.confirmed
                    ? currentHeight - tx.status.block_height + 1
                    : 0,
                blockNumber: tx.status.block_height,
                timestamp: tx.status.block_time,
            };
        } catch (error) {
            this.logger.error(
                `Failed to get BTC transaction ${txHash}: ${error.message}`,
            );
            return null;
        }
    }

    async getTransactionsForAddress(
        address: string,
    ): Promise<BlockchainTransaction[]> {
        try {
            const response = await axios.get(
                `${this.apiUrl}/address/${address}/txs`,
            );
            const currentHeight = await this.getCurrentBlockNumber();

            return response.data.map((tx: any) => {
                // Find the output that matches our address
                const relevantOutput = tx.vout.find(
                    (out: any) => out.scriptpubkey_address === address,
                );

                return {
                    hash: tx.txid,
                    from:
                        tx.vin[0]?.prevout?.scriptpubkey_address ||
                        'unknown',
                    to: address,
                    amount: relevantOutput
                        ? relevantOutput.value / 1e8
                        : 0,
                    confirmations: tx.status.confirmed
                        ? currentHeight - tx.status.block_height + 1
                        : 0,
                    blockNumber: tx.status.block_height,
                    timestamp: tx.status.block_time,
                };
            });
        } catch (error) {
            this.logger.error(
                `Failed to get BTC transactions for ${address}: ${error.message}`,
            );
            return [];
        }
    }

    async getCurrentBlockNumber(): Promise<number> {
        const response = await axios.get(
            `${this.apiUrl}/blocks/tip/height`,
        );
        return response.data;
    }

    async getConfirmations(txHash: string): Promise<number> {
        const tx = await this.getTransaction(txHash);
        return tx?.confirmations || 0;
    }
}
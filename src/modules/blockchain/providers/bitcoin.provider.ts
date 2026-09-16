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
  private readonly testnetApiUrl: string;

  constructor(private configService: ConfigService) {
    super();
    this.apiUrl =
      configService.get<string>('blockchain.bitcoin.apiUrl') ||
      'https://blockstream.info/api';
    this.testnetApiUrl =
      configService.get<string>('blockchain.bitcoin.testnetApiUrl') ||
      'https://blockstream.info/testnet/api';
  }

  private getEndpoint(network?: string): string {
    return network === 'testnet' ? this.testnetApiUrl : this.apiUrl;
  }

  async getBalance(address: string, network?: string): Promise<number> {
    const endpoint = this.getEndpoint(network);
    const response = await axios.get(`${endpoint}/address/${address}`);
    const stats = response.data.chain_stats;
    const satoshis = stats.funded_txo_sum - stats.spent_txo_sum;
    return satoshis / 1e8;
  }

  async getTransaction(
    txHash: string,
    network?: string,
  ): Promise<BlockchainTransaction | null> {
    const endpoint = this.getEndpoint(network);
    try {
      const response = await axios.get(`${endpoint}/tx/${txHash}`);
      const tx = response.data;
      const currentHeight = await this.getCurrentBlockNumber(network);

      const totalOutput = tx.vout.reduce(
        (sum: number, output: any) => sum + (output.value || 0),
        0,
      );

      return {
        hash: tx.txid,
        from: tx.vin[0]?.prevout?.scriptpubkey_address || 'unknown',
        to: tx.vout[0]?.scriptpubkey_address || 'unknown',
        amount: totalOutput / 1e8,
        confirmations: tx.status?.confirmed
          ? currentHeight - tx.status.block_height + 1
          : 0,
        blockNumber: tx.status?.block_height,
        timestamp: tx.status?.block_time,
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
    sinceTimestamp?: number,
    network?: string,
  ): Promise<BlockchainTransaction[]> {
    const endpoint = this.getEndpoint(network);
    try {
      const response = await axios.get(`${endpoint}/address/${address}/txs`);
      const currentHeight = await this.getCurrentBlockNumber(network);

      return response.data.map((tx: any) => {
        const relevantOutput = tx.vout?.find(
          (out: any) => out.scriptpubkey_address === address,
        );

        return {
          hash: tx.txid,
          from: tx.vin?.[0]?.prevout?.scriptpubkey_address || 'unknown',
          to: address,
          amount: relevantOutput ? relevantOutput.value / 1e8 : 0,
          confirmations: tx.status?.confirmed
            ? currentHeight - tx.status.block_height + 1
            : 0,
          blockNumber: tx.status?.block_height,
          timestamp: tx.status?.block_time,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to get BTC transactions for ${address}: ${error.message}`,
      );
      return [];
    }
  }

  async getCurrentBlockNumber(network?: string): Promise<number> {
    const endpoint = this.getEndpoint(network);
    const response = await axios.get(`${endpoint}/blocks/tip/height`);
    return Number(response.data) || 0;
  }

  async getConfirmations(txHash: string, network?: string): Promise<number> {
    const tx = await this.getTransaction(txHash, network);
    return tx?.confirmations || 0;
  }
}

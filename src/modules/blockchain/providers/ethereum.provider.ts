// src/modules/blockchain/providers/ethereum.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import {
  BaseBlockchainProvider,
  BlockchainTransaction,
} from './base-blockchain.provider';

const ERC20_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

@Injectable()
export class EthereumProvider extends BaseBlockchainProvider {
  private readonly logger = new Logger(EthereumProvider.name);
  private provider: ethers.JsonRpcProvider;
  private sepoliaProvider: ethers.JsonRpcProvider;

  constructor(private configService: ConfigService) {
    super();
    const rpcUrl =
      configService.get<string>('blockchain.ethereum.rpcUrl') ||
      'https://ethereum-rpc.publicnode.com';
    const sepoliaRpcUrl =
      configService.get<string>('blockchain.ethereum.sepoliaRpcUrl') ||
      'https://ethereum-sepolia-rpc.publicnode.com';

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpcUrl);
    this.logger.log(
      `Ethereum providers initialized (Mainnet: ${rpcUrl}, Sepolia: ${sepoliaRpcUrl})`,
    );
  }

  private getActiveProvider(network?: string): ethers.JsonRpcProvider {
    return network === 'sepolia' ? this.sepoliaProvider : this.provider;
  }

  async getBalance(address: string, network?: string): Promise<number> {
    const prov = this.getActiveProvider(network);
    const balance = await prov.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  }

  async getTransaction(
    txHash: string,
    network?: string,
  ): Promise<BlockchainTransaction | null> {
    const prov = this.getActiveProvider(network);
    try {
      const tx = await prov.getTransaction(txHash);
      if (!tx) return null;

      const receipt = await prov.getTransactionReceipt(txHash);
      const currentBlock = await prov.getBlockNumber();

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || 'contract_creation',
        amount: parseFloat(ethers.formatEther(tx.value)),
        confirmations: receipt ? currentBlock - receipt.blockNumber + 1 : 0,
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
    network?: string,
  ): Promise<BlockchainTransaction[]> {
    const prov = this.getActiveProvider(network);
    const results: BlockchainTransaction[] = [];

    try {
      const currentBlock = await prov.getBlockNumber();
      const fromBlock = sinceBlock
        ? Math.max(sinceBlock, currentBlock - 50)
        : currentBlock - 20;

      // 1. Scan for native ETH transfers and ERC-20 Transfer logs
      const paddedAddress = ethers.zeroPadValue(address, 32);

      // Fetch ERC-20 Transfer logs where 'to' matches our payment address
      const filter: ethers.Filter = {
        fromBlock,
        toBlock: 'latest',
        topics: [
          ERC20_TRANSFER_TOPIC,
          null, // from (any)
          paddedAddress, // to (our address)
        ],
      };

      const logs = await prov.getLogs(filter).catch((err) => {
        this.logger.debug(
          `Could not fetch logs for address ${address}: ${err.message}`,
        );
        return [];
      });

      for (const log of logs) {
        const blockNumber = log.blockNumber;
        const confirmations = currentBlock - blockNumber + 1;

        // USDT and USDC use 6 decimals
        const rawAmount = BigInt(log.data);
        const tokenAmount = Number(rawAmount) / 1e6;

        const fromTopic = log.topics[1];
        const fromAddress = fromTopic
          ? ethers.stripZerosLeft(fromTopic)
          : 'unknown';

        results.push({
          hash: log.transactionHash,
          from: fromAddress,
          to: address,
          amount: tokenAmount,
          confirmations,
          blockNumber,
        });
      }

      // 2. Fetch native ETH transactions via Etherscan / Block scanning if configured
      const apiKey = this.configService.get<string>(
        'blockchain.ethereum.apiKey',
      );
      if (apiKey && network !== 'sepolia') {
        try {
          const response = await fetch(
            `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=${fromBlock}&endblock=latest&sort=desc&apikey=${apiKey}`,
          );
          const data = await response.json();
          if (data.status === '1' && Array.isArray(data.result)) {
            for (const tx of data.result) {
              results.push({
                hash: tx.hash,
                from: tx.from,
                to: tx.to || address,
                amount: parseFloat(ethers.formatEther(tx.value)),
                confirmations: currentBlock - parseInt(tx.blockNumber, 10) + 1,
                blockNumber: parseInt(tx.blockNumber, 10),
                timestamp: parseInt(tx.timeStamp, 10),
              });
            }
          }
        } catch (e) {
          this.logger.debug(`Etherscan API lookup failed: ${e.message}`);
        }
      }

      return results;
    } catch (error) {
      this.logger.error(
        `Failed to get transactions for ${address}: ${error.message}`,
      );
      return [];
    }
  }

  async getCurrentBlockNumber(network?: string): Promise<number> {
    return this.getActiveProvider(network).getBlockNumber();
  }

  async getConfirmations(txHash: string, network?: string): Promise<number> {
    const tx = await this.getTransaction(txHash, network);
    return tx?.confirmations || 0;
  }
}

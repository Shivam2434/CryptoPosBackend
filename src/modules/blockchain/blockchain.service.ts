// src/modules/blockchain/blockchain.service.ts
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EthereumProvider } from './providers/ethereum.provider';
import { BitcoinProvider } from './providers/bitcoin.provider';
import {
  Payment,
  PaymentStatus,
  CryptoType,
} from '../payments/entities/payment.entity';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private isChecking = false;

  constructor(
    @InjectRepository(Payment)
    private paymentsRepo: Repository<Payment>,
    private ethereumProvider: EthereumProvider,
    private bitcoinProvider: BitcoinProvider,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkPendingPayments(): Promise<void> {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      // Stateless database lookup: find all active unconfirmed payments
      const activePayments = await this.paymentsRepo.find({
        where: {
          status: In([
            PaymentStatus.PENDING,
            PaymentStatus.DETECTED,
            PaymentStatus.CONFIRMING,
          ]),
          expiresAt: MoreThan(new Date()),
        },
        take: 50,
        order: { lastCheckedAt: 'ASC' },
      });

      if (activePayments.length === 0) {
        // Expire any stale payments
        await this.paymentsService.expireOldPayments();
        return;
      }

      this.logger.debug(
        `Stateless monitoring checking ${activePayments.length} active payments...`,
      );

      for (const payment of activePayments) {
        try {
          await this.checkPayment(payment);
        } catch (err) {
          this.logger.error(
            `Error monitoring payment ${payment.id}: ${err.message}`,
          );
        }
      }

      // Also check for expired payments
      await this.paymentsService.expireOldPayments();
    } finally {
      this.isChecking = false;
    }
  }

  private async checkPayment(payment: Payment): Promise<void> {
    // Mark checked timestamp for distributed coordination
    payment.lastCheckedAt = new Date();
    await this.paymentsRepo.save(payment);

    const provider = this.getProvider(payment.cryptoType);
    const transactions = await provider.getTransactionsForAddress(
      payment.paymentAddress,
      undefined,
      payment.network,
    );

    for (const tx of transactions) {
      // Check if transaction matches expected amount (allow 1% slippage tolerance)
      const tolerance = payment.cryptoAmount * 0.01;
      const amountMatch =
        Math.abs(tx.amount - payment.cryptoAmount) <= tolerance;

      if (
        amountMatch &&
        tx.to?.toLowerCase() === payment.paymentAddress.toLowerCase()
      ) {
        if (
          payment.status === PaymentStatus.PENDING &&
          tx.confirmations === 0
        ) {
          this.logger.log(
            `Payment ${payment.id} detected in mempool: ${tx.hash}`,
          );
          await this.paymentsService.updatePaymentStatus(
            payment.id,
            PaymentStatus.DETECTED,
            { txHash: tx.hash, receivedAmount: tx.amount },
          );
        } else if (tx.confirmations > 0) {
          if (tx.confirmations >= payment.requiredConfirmations) {
            this.logger.log(
              `Payment ${payment.id} CONFIRMED (${tx.confirmations}/${payment.requiredConfirmations}): ${tx.hash}`,
            );
            await this.paymentsService.updatePaymentStatus(
              payment.id,
              PaymentStatus.CONFIRMED,
              {
                txHash: tx.hash,
                confirmations: tx.confirmations,
                receivedAmount: tx.amount,
              },
            );
          } else if (
            payment.status !== PaymentStatus.CONFIRMING ||
            payment.confirmations !== tx.confirmations
          ) {
            this.logger.log(
              `Payment ${payment.id} confirming: ${tx.confirmations}/${payment.requiredConfirmations}`,
            );
            await this.paymentsService.updatePaymentStatus(
              payment.id,
              PaymentStatus.CONFIRMING,
              {
                txHash: tx.hash,
                confirmations: tx.confirmations,
                receivedAmount: tx.amount,
              },
            );
          }
        }
        break;
      }
    }
  }

  private getProvider(cryptoType: CryptoType) {
    switch (cryptoType) {
      case CryptoType.BTC:
        return this.bitcoinProvider;
      case CryptoType.ETH:
      case CryptoType.USDT_ERC20:
      case CryptoType.USDC_ERC20:
        return this.ethereumProvider;
      default:
        return this.ethereumProvider;
    }
  }
}

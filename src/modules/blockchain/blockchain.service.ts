// src/modules/blockchain/blockchain.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EthereumProvider } from './providers/ethereum.provider';
import { BitcoinProvider } from './providers/bitcoin.provider';
import { Payment, PaymentStatus, CryptoType } from '../payments/entities/payment.entity';

// These will be injected from payments module via forwardRef
import { PaymentsService } from '../payments/payments.service';
import { PaymentsGateway } from '../payments/payments.gateway';

interface MonitoredPayment {
    payment: Payment;
    startTime: number;
}

@Injectable()
export class BlockchainService {
    private readonly logger = new Logger(BlockchainService.name);
    private monitoredPayments: Map<string, MonitoredPayment> = new Map();

    constructor(
        private ethereumProvider: EthereumProvider,
        private bitcoinProvider: BitcoinProvider,
        private configService: ConfigService,
    ) { }

    // These are set after module initialization to avoid circular deps
    private paymentsService: PaymentsService;
    private paymentsGateway: PaymentsGateway;

    setDependencies(
        paymentsService: PaymentsService,
        paymentsGateway: PaymentsGateway,
    ) {
        this.paymentsService = paymentsService;
        this.paymentsGateway = paymentsGateway;
    }

    startMonitoring(payment: Payment): void {
        this.monitoredPayments.set(payment.id, {
            payment,
            startTime: Date.now(),
        });
        this.logger.log(
            `Started monitoring payment ${payment.id} for ${payment.cryptoAmount} ${payment.cryptoType} to ${payment.paymentAddress}`,
        );
    }

    stopMonitoring(paymentId: string): void {
        this.monitoredPayments.delete(paymentId);
        this.logger.log(`Stopped monitoring payment ${paymentId}`);
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async checkPayments(): Promise<void> {
        if (this.monitoredPayments.size === 0) return;

        this.logger.debug(
            `Checking ${this.monitoredPayments.size} monitored payments...`,
        );

        for (const [paymentId, monitored] of this.monitoredPayments) {
            try {
                await this.checkSinglePayment(monitored);
            } catch (error) {
                this.logger.error(
                    `Error checking payment ${paymentId}: ${error.message}`,
                );
            }
        }
    }

    private async checkSinglePayment(
        monitored: MonitoredPayment,
    ): Promise<void> {
        const { payment } = monitored;

        // Check if expired
        if (new Date() > new Date(payment.expiresAt)) {
            await this.handleExpired(payment);
            return;
        }

        const provider = this.getProvider(payment.cryptoType);

        if (
            payment.status === PaymentStatus.PENDING ||
            payment.status === PaymentStatus.DETECTED
        ) {
            // Check for incoming transactions
            const transactions =
                await provider.getTransactionsForAddress(
                    payment.paymentAddress,
                    Math.floor(monitored.startTime / 1000),
                );

            for (const tx of transactions) {
                // Check if this transaction matches the expected amount
                // Allow 1% tolerance
                const tolerance = payment.cryptoAmount * 0.01;
                const amountMatch =
                    Math.abs(tx.amount - payment.cryptoAmount) <= tolerance;

                if (
                    amountMatch &&
                    tx.to?.toLowerCase() ===
                    payment.paymentAddress.toLowerCase()
                ) {
                    if (
                        payment.status === PaymentStatus.PENDING &&
                        tx.confirmations === 0
                    ) {
                        await this.handleDetected(payment, tx.hash);
                    } else if (tx.confirmations > 0) {
                        await this.handleConfirming(
                            payment,
                            tx.hash,
                            tx.confirmations,
                        );

                        if (
                            tx.confirmations >=
                            payment.requiredConfirmations
                        ) {
                            await this.handleConfirmed(
                                payment,
                                tx.hash,
                                tx.amount,
                            );
                        }
                    }
                    break;
                }
            }
        }
    }

    private async handleDetected(
        payment: Payment,
        txHash: string,
    ): Promise<void> {
        this.logger.log(
            `Payment ${payment.id} detected in mempool: ${txHash}`,
        );

        if (this.paymentsService) {
            await this.paymentsService.updatePaymentStatus(
                payment.id,
                PaymentStatus.DETECTED,
                { txHash },
            );
        }

        if (this.paymentsGateway) {
            this.paymentsGateway.notifyPaymentUpdate(payment.id, {
                status: PaymentStatus.DETECTED,
                txHash,
                confirmations: 0,
            });
        }

        // Update monitored payment
        const monitored = this.monitoredPayments.get(payment.id);
        if (monitored) {
            monitored.payment.status = PaymentStatus.DETECTED;
            monitored.payment.txHash = txHash;
        }
    }

    private async handleConfirming(
        payment: Payment,
        txHash: string,
        confirmations: number,
    ): Promise<void> {
        this.logger.log(
            `Payment ${payment.id} confirming: ${confirmations}/${payment.requiredConfirmations}`,
        );

        if (this.paymentsService) {
            await this.paymentsService.updatePaymentStatus(
                payment.id,
                PaymentStatus.CONFIRMING,
                { txHash, confirmations },
            );
        }

        if (this.paymentsGateway) {
            this.paymentsGateway.notifyPaymentUpdate(payment.id, {
                status: PaymentStatus.CONFIRMING,
                txHash,
                confirmations,
                requiredConfirmations: payment.requiredConfirmations,
            });
        }
    }

    private async handleConfirmed(
        payment: Payment,
        txHash: string,
        receivedAmount: number,
    ): Promise<void> {
        this.logger.log(`Payment ${payment.id} CONFIRMED: ${txHash}`);

        if (this.paymentsService) {
            await this.paymentsService.updatePaymentStatus(
                payment.id,
                PaymentStatus.CONFIRMED,
                { txHash, receivedAmount },
            );
        }

        if (this.paymentsGateway) {
            this.paymentsGateway.notifyPaymentUpdate(payment.id, {
                status: PaymentStatus.CONFIRMED,
                txHash,
                receivedAmount,
            });
        }

        this.stopMonitoring(payment.id);
    }

    private async handleExpired(payment: Payment): Promise<void> {
        this.logger.log(`Payment ${payment.id} expired`);

        if (this.paymentsService) {
            await this.paymentsService.updatePaymentStatus(
                payment.id,
                PaymentStatus.EXPIRED,
            );
        }

        if (this.paymentsGateway) {
            this.paymentsGateway.notifyPaymentUpdate(payment.id, {
                status: PaymentStatus.EXPIRED,
            });
        }

        this.stopMonitoring(payment.id);
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
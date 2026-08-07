// src/modules/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, CryptoType } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PricingService } from '../pricing/pricing.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { MerchantsService } from '../merchants/merchants.service';
import * as QRCode from 'qrcode';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectRepository(Payment)
        private paymentsRepo: Repository<Payment>,
        private pricingService: PricingService,
        private blockchainService: BlockchainService,
        private merchantsService: MerchantsService,
        private configService: ConfigService,
    ) { }

    async createPayment(
        merchantId: string,
        dto: CreatePaymentDto,
    ): Promise<Payment> {
        const merchant = await this.merchantsService.findById(merchantId);

        // Check merchant accepts this crypto
        if (!merchant.acceptedCryptos.includes(dto.cryptoType.replace('_ERC20', ''))) {
            throw new BadRequestException(
                `Merchant does not accept ${dto.cryptoType}`,
            );
        }

        // Get current exchange rate
        const exchangeRate = await this.pricingService.getExchangeRate(
            dto.cryptoType,
            'AUD',
        );

        // Calculate crypto amount with slippage buffer
        const slippage =
            this.configService.get<number>('pricing.slippagePercent') / 100;
        const cryptoAmount = dto.audAmount / exchangeRate;
        const cryptoAmountWithBuffer = cryptoAmount * (1 - slippage);

        // Get payment address (merchant's wallet for MVP)
        const paymentAddress = this.getPaymentAddress(merchant, dto.cryptoType);
        if (!paymentAddress) {
            throw new BadRequestException(
                `No wallet configured for ${dto.cryptoType}`,
            );
        }

        // Generate QR code
        const qrData = this.generateQrData(
            dto.cryptoType,
            paymentAddress,
            cryptoAmountWithBuffer,
        );
        const qrCodeData = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
        });

        // Calculate expiry
        const timeoutMinutes = this.configService.get<number>(
            'blockchain.paymentTimeoutMinutes',
        );
        const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

        // Determine required confirmations
        const requiredConfirmations =
            this.configService.get<number>(
                `blockchain.confirmationsRequired.${dto.cryptoType.replace('_ERC20', '')}`,
            ) || 2;

        const payment = this.paymentsRepo.create({
            merchantId,
            audAmount: dto.audAmount,
            cryptoAmount: parseFloat(cryptoAmountWithBuffer.toFixed(8)),
            cryptoType: dto.cryptoType,
            exchangeRate,
            paymentAddress,
            qrCodeData,
            status: PaymentStatus.PENDING,
            orderReference: dto.orderReference,
            description: dto.description,
            webhookUrl: dto.webhookUrl,
            expiresAt,
            requiredConfirmations,
        });

        const saved = await this.paymentsRepo.save(payment);

        // Start monitoring this payment
        this.blockchainService.startMonitoring(saved);

        this.logger.log(
            `Payment created: ${saved.id} | ${dto.audAmount} AUD = ${cryptoAmountWithBuffer.toFixed(8)} ${dto.cryptoType}`,
        );

        return saved;
    }

    async getPayment(paymentId: string): Promise<Payment> {
        const payment = await this.paymentsRepo.findOne({
            where: { id: paymentId },
        });
        if (!payment) throw new NotFoundException('Payment not found');
        return payment;
    }

    async getPaymentStatus(paymentId: string): Promise<{
        status: PaymentStatus;
        confirmations: number;
        requiredConfirmations: number;
        txHash: string | null;
    }> {
        const payment = await this.getPayment(paymentId);
        return {
            status: payment.status,
            confirmations: payment.confirmations,
            requiredConfirmations: payment.requiredConfirmations,
            txHash: payment.txHash,
        };
    }

    async getMerchantPayments(
        merchantId: string,
        page = 1,
        limit = 20,
        status?: PaymentStatus,
    ) {
        const where: any = { merchantId };
        if (status) where.status = status;

        const [payments, total] = await this.paymentsRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            payments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async updatePaymentStatus(
        paymentId: string,
        status: PaymentStatus,
        additionalData?: Partial<Payment>,
    ): Promise<Payment> {
        const payment = await this.getPayment(paymentId);
        payment.status = status;
        if (additionalData) {
            Object.assign(payment, additionalData);
        }
        if (status === PaymentStatus.CONFIRMED) {
            payment.confirmedAt = new Date();
        }
        return this.paymentsRepo.save(payment);
    }

    async expireOldPayments(): Promise<void> {
        const expired = await this.paymentsRepo.find({
            where: {
                status: In([PaymentStatus.PENDING, PaymentStatus.DETECTED]),
                expiresAt: LessThan(new Date()),
            },
        });

        for (const payment of expired) {
            payment.status = PaymentStatus.EXPIRED;
            await this.paymentsRepo.save(payment);
            this.logger.log(`Payment expired: ${payment.id}`);
        }
    }

    private getPaymentAddress(merchant: any, cryptoType: CryptoType): string {
        switch (cryptoType) {
            case CryptoType.ETH:
            case CryptoType.USDT_ERC20:
            case CryptoType.USDC_ERC20:
                return merchant.ethWalletAddress;
            case CryptoType.BTC:
                return merchant.btcWalletAddress;
            default:
                return null;
        }
    }

    private generateQrData(
        cryptoType: CryptoType,
        address: string,
        amount: number,
    ): string {
        switch (cryptoType) {
            case CryptoType.ETH:
                return `ethereum:${address}?value=${(amount * 1e18).toFixed(0)}`;
            case CryptoType.BTC:
                return `bitcoin:${address}?amount=${amount.toFixed(8)}`;
            case CryptoType.USDT_ERC20:
            case CryptoType.USDC_ERC20:
                // ERC20 tokens need contract interaction, simplified here
                return `ethereum:${address}?value=0&data=${amount}`;
            default:
                return `${address}`;
        }
    }
}
// src/modules/payments/payments.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, PaymentStatus, CryptoType, PaymentEnvironment } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PricingService } from '../pricing/pricing.service';
import { PaymentAddressService } from './address/payment-address.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { PaymentsGateway } from './payments.gateway';
import { AuthContext } from '../../common/interfaces/auth-context.interface';
import * as QRCode from 'qrcode';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectRepository(Payment)
        private paymentsRepo: Repository<Payment>,
        private pricingService: PricingService,
        private paymentAddressService: PaymentAddressService,
        private webhooksService: WebhooksService,
        private paymentsGateway: PaymentsGateway,
        private configService: ConfigService,
    ) { }

    async createPayment(
        auth: AuthContext,
        dto: CreatePaymentDto,
    ): Promise<Payment> {
        const organizationId = auth.organizationId;
        const idempotencyKey = dto.idempotencyKey;

        // 1. Idempotency check
        if (idempotencyKey) {
            const existingPayment = await this.paymentsRepo.findOne({
                where: { organizationId, idempotencyKey },
            });
            if (existingPayment) {
                this.logger.log(`Idempotent payment match returned for key ${idempotencyKey} (Payment: ${existingPayment.id})`);
                return existingPayment;
            }
        }

        // 2. Exchange rate calculation with slippage
        const exchangeRate = await this.pricingService.getExchangeRate(
            dto.cryptoType,
            'AUD',
        );

        const slippagePercent = this.configService.get<number>('pricing.slippagePercent') ?? 1.0;
        const slippage = slippagePercent / 100;
        const baseCryptoAmount = dto.audAmount / exchangeRate;
        const cryptoAmountWithBuffer = baseCryptoAmount * (1 - slippage);

        // 3. Deposit address allocation
        const addressResult = await this.paymentAddressService.getAddressForPayment({
            organizationId,
            merchantId: auth.merchantId,
            cryptoType: dto.cryptoType,
            network: dto.network || 'mainnet',
            orderReference: dto.orderReference,
        });

        const paymentAddress = addressResult.address;

        // 4. Generate QR code
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

        // 5. Compute expiry
        const timeoutMinutes = this.configService.get<number>('blockchain.paymentTimeoutMinutes') ?? 15;
        const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

        // 6. Confirmations required
        const requiredConfirmations = this.getRequiredConfirmations(dto.cryptoType);

        const environment = (dto.environment || auth.environment || PaymentEnvironment.LIVE) as PaymentEnvironment;
        const network = dto.network || (environment === PaymentEnvironment.TEST ? 'sepolia' : 'mainnet');

        const payment = this.paymentsRepo.create({
            organizationId,
            merchantId: auth.merchantId,
            locationId: dto.locationId || auth.locationId,
            deviceId: dto.deviceId || auth.deviceId,
            integrationId: dto.integrationId,
            network,
            environment,
            idempotencyKey,
            audAmount: dto.audAmount,
            cryptoAmount: parseFloat(cryptoAmountWithBuffer.toFixed(8)),
            cryptoType: dto.cryptoType,
            exchangeRate,
            paymentAddress,
            qrCodeData,
            status: PaymentStatus.PENDING,
            orderReference: dto.orderReference,
            description: dto.description,
            metadata: dto.metadata || {},
            webhookUrl: dto.webhookUrl,
            expiresAt,
            requiredConfirmations,
        });

        const saved = await this.paymentsRepo.save(payment);

        this.logger.log(
            `Payment created: ${saved.id} | ${dto.audAmount} AUD = ${cryptoAmountWithBuffer.toFixed(8)} ${dto.cryptoType} | Org: ${organizationId}`,
        );

        // Emit payment.created event asynchronously to webhooks
        this.webhooksService.dispatchEvent(organizationId, 'payment.created', this.formatPaymentEvent(saved)).catch((err) => {
            this.logger.error(`Failed to dispatch payment.created webhook: ${err.message}`);
        });

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
            txHash: payment.txHash || null,
        };
    }

    async getOrganizationPayments(
        organizationId: string,
        page = 1,
        limit = 20,
        status?: PaymentStatus,
        locationId?: string,
        environment?: PaymentEnvironment,
    ) {
        const where: any = { organizationId };
        if (status) where.status = status;
        if (locationId) where.locationId = locationId;
        if (environment) where.environment = environment;

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
        if (status === PaymentStatus.CONFIRMED && !payment.confirmedAt) {
            payment.confirmedAt = new Date();
        }

        const updated = await this.paymentsRepo.save(payment);

        // Notify real-time WebSockets
        this.paymentsGateway.notifyPaymentUpdate(payment.id, payment.organizationId, {
            status: updated.status,
            txHash: updated.txHash,
            confirmations: updated.confirmations,
            requiredConfirmations: updated.requiredConfirmations,
            receivedAmount: updated.receivedAmount,
        });

        // Dispatch signed webhook
        const eventName = `payment.${status}`;
        this.webhooksService.dispatchEvent(
            payment.organizationId,
            eventName,
            this.formatPaymentEvent(updated),
        ).catch((err) => {
            this.logger.error(`Failed to dispatch ${eventName} webhook: ${err.message}`);
        });

        return updated;
    }

    async expireOldPayments(): Promise<void> {
        const expired = await this.paymentsRepo.find({
            where: {
                status: In([PaymentStatus.PENDING, PaymentStatus.DETECTED]),
                expiresAt: LessThan(new Date()),
            },
        });

        for (const payment of expired) {
            await this.updatePaymentStatus(payment.id, PaymentStatus.EXPIRED);
            this.logger.log(`Payment expired: ${payment.id}`);
        }
    }

    private getRequiredConfirmations(cryptoType: CryptoType): number {
        const key = cryptoType.replace('_ERC20', '');
        return this.configService.get<number>(`blockchain.confirmationsRequired.${key}`) ?? 2;
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
                return `ethereum:${address}?value=0&data=${amount}`;
            default:
                return `${address}`;
        }
    }

    private formatPaymentEvent(payment: Payment): Record<string, any> {
        return {
            id: payment.id,
            organizationId: payment.organizationId,
            locationId: payment.locationId,
            deviceId: payment.deviceId,
            orderReference: payment.orderReference,
            audAmount: payment.audAmount,
            cryptoAmount: payment.cryptoAmount,
            cryptoType: payment.cryptoType,
            exchangeRate: payment.exchangeRate,
            paymentAddress: payment.paymentAddress,
            status: payment.status,
            txHash: payment.txHash,
            confirmations: payment.confirmations,
            requiredConfirmations: payment.requiredConfirmations,
            receivedAmount: payment.receivedAmount,
            environment: payment.environment,
            network: payment.network,
            metadata: payment.metadata,
            createdAt: payment.createdAt,
            confirmedAt: payment.confirmedAt,
            expiresAt: payment.expiresAt,
        };
    }
}
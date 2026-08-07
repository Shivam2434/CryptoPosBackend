// src/modules/payments/entities/payment.entity.ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';

export enum PaymentStatus {
    PENDING = 'pending',
    DETECTED = 'detected',     // Transaction seen in mempool
    CONFIRMING = 'confirming',  // Waiting for confirmations
    CONFIRMED = 'confirmed',    // Payment confirmed
    EXPIRED = 'expired',        // Payment window expired
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

export enum CryptoType {
    BTC = 'BTC',
    ETH = 'ETH',
    USDT_ERC20 = 'USDT_ERC20',
    USDC_ERC20 = 'USDC_ERC20',
}

@Entity('payments')
export class Payment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'merchant_id' })
    @Index()
    merchantId: string;

    @ManyToOne(() => Merchant, (merchant) => merchant.payments)
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;

    // Amount in AUD the merchant wants to charge
    @Column({ name: 'aud_amount', type: 'decimal', precision: 12, scale: 2 })
    audAmount: number;

    // Crypto equivalent at time of payment creation
    @Column({ name: 'crypto_amount', type: 'decimal', precision: 18, scale: 8 })
    cryptoAmount: number;

    @Column({ name: 'crypto_type', type: 'enum', enum: CryptoType })
    cryptoType: CryptoType;

    // Exchange rate at time of payment creation
    @Column({ name: 'exchange_rate', type: 'decimal', precision: 18, scale: 8 })
    exchangeRate: number;

    // The address where customer should send funds
    @Column({ name: 'payment_address' })
    @Index()
    paymentAddress: string;

    // QR code data
    @Column({ name: 'qr_code_data', type: 'text', nullable: true })
    qrCodeData: string;

    @Column({
        type: 'enum',
        enum: PaymentStatus,
        default: PaymentStatus.PENDING,
    })
    @Index()
    status: PaymentStatus;

    // Blockchain transaction hash once detected
    @Column({ name: 'tx_hash', nullable: true })
    @Index()
    txHash: string;

    @Column({ name: 'confirmations', default: 0 })
    confirmations: number;

    @Column({ name: 'required_confirmations', default: 2 })
    requiredConfirmations: number;

    // Amount actually received (may differ slightly)
    @Column({
        name: 'received_amount',
        type: 'decimal',
        precision: 18,
        scale: 8,
        nullable: true,
    })
    receivedAmount: number;

    // Optional reference/order ID from merchant
    @Column({ name: 'order_reference', nullable: true })
    orderReference: string;

    @Column({ nullable: true })
    description: string;

    // Customer-facing note
    @Column({ name: 'customer_note', nullable: true })
    customerNote: string;

    // Webhook URL for this payment (overrides merchant default)
    @Column({ name: 'webhook_url', nullable: true })
    webhookUrl: string;

    // Expiry time for the payment
    @Column({ name: 'expires_at' })
    expiresAt: Date;

    @Column({ name: 'confirmed_at', nullable: true })
    confirmedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}


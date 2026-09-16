// src/modules/payments/entities/payment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Organization } from '../../organizations/entities/organization.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  DETECTED = 'detected', // Transaction seen in mempool
  CONFIRMING = 'confirming', // Waiting for confirmations
  CONFIRMED = 'confirmed', // Payment confirmed
  EXPIRED = 'expired', // Payment window expired
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum CryptoType {
  BTC = 'BTC',
  ETH = 'ETH',
  USDT_ERC20 = 'USDT_ERC20',
  USDC_ERC20 = 'USDC_ERC20',
}

export enum PaymentEnvironment {
  LIVE = 'live',
  TEST = 'test',
}

@Entity('payments')
@Index(['organizationId', 'idempotencyKey'], {
  unique: true,
  where: 'idempotency_key IS NOT NULL',
})
@Index(['organizationId', 'createdAt'])
@Index(['organizationId', 'status'])
@Index(['organizationId', 'locationId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'merchant_id', nullable: true })
  @Index()
  merchantId?: string;

  @ManyToOne(() => Merchant, (merchant) => merchant.payments, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'merchant_id' })
  merchant?: Merchant;

  @Column({ name: 'location_id', nullable: true })
  @Index()
  locationId?: string;

  @Column({ name: 'device_id', nullable: true })
  @Index()
  deviceId?: string;

  @Column({ name: 'integration_id', nullable: true })
  @Index()
  integrationId?: string;

  @Column({ default: 'mainnet' })
  network: string; // 'mainnet', 'sepolia', 'testnet'

  @Column({
    type: 'enum',
    enum: PaymentEnvironment,
    default: PaymentEnvironment.LIVE,
  })
  @Index()
  environment: PaymentEnvironment;

  @Column({ name: 'idempotency_key', nullable: true })
  idempotencyKey?: string;

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

  // QR code data URI
  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData?: string;

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
  txHash?: string;

  @Column({ name: 'confirmations', default: 0 })
  confirmations: number;

  @Column({ name: 'required_confirmations', default: 2 })
  requiredConfirmations: number;

  // Amount actually received
  @Column({
    name: 'received_amount',
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
  })
  receivedAmount?: number;

  // Optional reference/order ID from merchant / POS
  @Column({ name: 'order_reference', nullable: true })
  @Index()
  orderReference?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ name: 'customer_note', nullable: true })
  customerNote?: string;

  // Legacy direct webhook URL
  @Column({ name: 'webhook_url', nullable: true })
  webhookUrl?: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata?: Record<string, any>;

  @Column({ name: 'expires_at' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'confirmed_at', nullable: true })
  confirmedAt?: Date;

  // Last time a blockchain monitor worker inspected this payment
  @Column({ name: 'last_checked_at', nullable: true })
  @Index()
  lastCheckedAt?: Date;

  @Column({ name: 'settlement_id', nullable: true })
  @Index()
  settlementId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

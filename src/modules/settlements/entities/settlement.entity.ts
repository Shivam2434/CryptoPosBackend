// src/modules/settlements/entities/settlement.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum SettlementStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

@Entity('settlements')
export class Settlement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    @Index()
    organizationId: string;

    @Column({ name: 'merchant_id', nullable: true })
    @Index()
    merchantId?: string;

    @Column({ name: 'location_id', nullable: true })
    @Index()
    locationId?: string;

    // Gross AUD volume of transactions in batch
    @Column({ name: 'aud_amount', type: 'decimal', precision: 12, scale: 2 })
    audAmount: number;

    // Platform fee deducted in AUD
    @Column({ name: 'fee_aud_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    feeAudAmount: number;

    // Net AUD amount to deposit into merchant bank account
    @Column({ name: 'net_aud_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
    netAudAmount: number;

    @Column({ name: 'crypto_amount', type: 'decimal', precision: 18, scale: 8, default: 0 })
    cryptoAmount: number;

    @Column({ name: 'crypto_type', default: 'MIXED' })
    cryptoType: string;

    @Column({
        type: 'enum',
        enum: SettlementStatus,
        default: SettlementStatus.PENDING,
    })
    @Index()
    status: SettlementStatus;

    @Column('simple-array', { name: 'payment_ids' })
    paymentIds: string[];

    @Column({ name: 'payout_provider', default: 'manual_bank' })
    payoutProvider: string; // 'manual_bank', 'zepto', 'zai', 'mock'

    @Column({ name: 'bank_reference', nullable: true })
    bankReference?: string;

    @Column({ type: 'jsonb', nullable: true, default: {} })
    metadata: Record<string, any>;

    @Column({ name: 'processed_at', nullable: true })
    processedAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
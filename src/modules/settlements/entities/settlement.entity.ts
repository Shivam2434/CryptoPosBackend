// src/modules/settlements/entities/settlement.entity.ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

export enum SettlementStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

@Entity('settlements')
export class Settlement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'merchant_id' })
    merchantId: string;

    @Column({ name: 'aud_amount', type: 'decimal', precision: 12, scale: 2 })
    audAmount: number;

    @Column({ name: 'crypto_amount', type: 'decimal', precision: 18, scale: 8 })
    cryptoAmount: number;

    @Column({ name: 'crypto_type' })
    cryptoType: string;

    @Column({
        type: 'enum',
        enum: SettlementStatus,
        default: SettlementStatus.PENDING,
    })
    status: SettlementStatus;

    @Column('simple-array', { name: 'payment_ids' })
    paymentIds: string[];

    @Column({ name: 'bank_reference', nullable: true })
    bankReference: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
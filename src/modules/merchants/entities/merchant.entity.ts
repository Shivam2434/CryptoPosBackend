// src/modules/merchants/entities/merchant.entity.ts
import {
    Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
    UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { Payment } from '../../payments/entities/payment.entity';

export enum MerchantStatus {
    PENDING = 'pending',
    ACTIVE = 'active',
    SUSPENDED = 'suspended',
}

@Entity('merchants')
export class Merchant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    email: string;

    @Column()
    password: string;

    @Column({ name: 'business_name' })
    businessName: string;

    @Column({ name: 'business_abn', nullable: true })
    businessAbn: string; // Australian Business Number

    @Column({ name: 'contact_name' })
    contactName: string;

    @Column({ name: 'contact_phone', nullable: true })
    contactPhone: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    city: string;

    @Column({ nullable: true })
    state: string;

    @Column({ nullable: true })
    postcode: string;

    @Column({
        type: 'enum',
        enum: MerchantStatus,
        default: MerchantStatus.PENDING,
    })
    status: MerchantStatus;

    // Crypto wallet addresses for receiving payments
    @Column({ name: 'eth_wallet_address', nullable: true })
    ethWalletAddress: string;

    @Column({ name: 'btc_wallet_address', nullable: true })
    btcWalletAddress: string;

    @Column({ name: 'usdt_wallet_address', nullable: true })
    usdtWalletAddress: string;

    // Accepted cryptocurrencies
    @Column('simple-array', {
        name: 'accepted_cryptos',
        default: 'ETH,BTC,USDT',
    })
    acceptedCryptos: string[];

    // Settlement preference
    @Column({
        name: 'settlement_preference',
        default: 'crypto', // 'crypto' or 'aud'
    })
    settlementPreference: string;

    @Column({ name: 'bank_bsb', nullable: true })
    bankBsb: string;

    @Column({ name: 'bank_account_number', nullable: true })
    bankAccountNumber: string;

    // API key for programmatic access
    @Column({ name: 'api_key', unique: true, nullable: true })
    @Index()
    apiKey: string;

    @OneToMany(() => Payment, (payment) => payment.merchant)
    payments: Payment[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
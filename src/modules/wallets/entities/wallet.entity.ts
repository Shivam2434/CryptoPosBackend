// src/modules/wallets/entities/wallet.entity.ts
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
import { Organization } from '../../organizations/entities/organization.entity';
import { Merchant } from '../../merchants/entities/merchant.entity';
import { Location } from '../../locations/entities/location.entity';

export enum WalletType {
  EXTERNAL = 'EXTERNAL', // Merchant self-custody receiving address (MVP)
  PLATFORM_GENERATED = 'PLATFORM_GENERATED', // Future: non-custodial MPC / HD wallet generated for merchant
  CUSTODIAL = 'CUSTODIAL', // Future: enterprise pooled custodial address
}

export enum WalletStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

@Entity('wallets')
@Index(['organizationId', 'asset', 'network', 'status'])
@Index(['organizationId', 'locationId', 'asset', 'network'])
@Index(['organizationId', 'address'])
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'merchant_id', nullable: true })
  @Index()
  merchantId?: string;

  @ManyToOne(() => Merchant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'merchant_id' })
  merchant?: Merchant;

  @Column({ name: 'location_id', nullable: true })
  @Index()
  locationId?: string;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location?: Location;

  // Public on-chain receiving address (NO private keys or seed phrases stored)
  @Column()
  address: string;

  // Target blockchain network (e.g. 'mainnet', 'sepolia', 'testnet')
  @Column({ default: 'mainnet' })
  network: string;

  // Supported asset (e.g. 'BTC', 'ETH', 'USDT', 'USDC', 'USDT_ERC20', 'USDC_ERC20')
  @Column()
  asset: string;

  @Column({
    type: 'enum',
    enum: WalletType,
    default: WalletType.EXTERNAL,
  })
  type: WalletType;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  @Index()
  status: WalletStatus;

  @Column({ name: 'is_primary', default: true })
  isPrimary: boolean;

  // Friendly merchant-facing name (e.g. "Main Cold Ledger", "Sydney Register Address")
  @Column({ nullable: true })
  label?: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

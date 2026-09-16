// src/modules/organizations/entities/organization.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum OrganizationStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column({
    type: 'enum',
    enum: OrganizationStatus,
    default: OrganizationStatus.ACTIVE,
  })
  status: OrganizationStatus;

  @Column({ name: 'default_currency', default: 'AUD' })
  defaultCurrency: string;

  @Column({ name: 'settlement_preference', default: 'crypto' })
  settlementPreference: string; // 'crypto' or 'aud'

  @Column({ type: 'jsonb', nullable: true, default: {} })
  settings: Record<string, any>;

  @Column({ name: 'billing_email', nullable: true })
  billingEmail?: string;

  @Column({ name: 'support_email', nullable: true })
  supportEmail?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

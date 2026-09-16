// src/modules/devices/entities/device.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DeviceStatus {
  PENDING_PAIRING = 'pending_pairing',
  ACTIVE = 'active',
  REVOKED = 'revoked',
}

@Entity('devices')
export class Device {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column({ name: 'location_id' })
  @Index()
  locationId: string;

  @Column()
  name: string;

  @Column({ name: 'device_code', unique: true })
  @Index()
  deviceCode: string;

  // SHA-256 hash of device auth token
  @Column({ name: 'token_hash', nullable: true })
  @Index()
  tokenHash?: string;

  @Column({
    type: 'enum',
    enum: DeviceStatus,
    default: DeviceStatus.PENDING_PAIRING,
  })
  status: DeviceStatus;

  @Column({ name: 'last_seen_at', nullable: true })
  lastSeenAt?: Date;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

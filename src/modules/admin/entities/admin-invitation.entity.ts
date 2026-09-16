// src/modules/admin/entities/admin-invitation.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AdminScopeLevel } from '../../../common/interfaces/auth-context.interface';

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Entity('admin_invitations')
@Index(['email', 'status'])
@Index(['tokenHash', 'status'])
export class AdminInvitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  email: string;

  @Column({ name: 'invited_by_user_id' })
  @Index()
  invitedByUserId: string;

  @Column({ name: 'role_id' })
  roleId: string; // e.g. 'SUB_ADMIN' or role UUID / name

  @Column('simple-array', { default: '*' })
  permissions: string[];

  @Column({
    name: 'scope_level',
    type: 'enum',
    enum: AdminScopeLevel,
    default: AdminScopeLevel.ORGANIZATION,
  })
  scopeLevel: AdminScopeLevel;

  @Column('simple-array', { name: 'scoped_organization_ids', default: '' })
  scopedOrganizationIds: string[];

  @Column('simple-array', { name: 'scoped_merchant_ids', default: '' })
  scopedMerchantIds: string[];

  // SHA-256 hash of the cryptographic invitation secret token
  @Column({ name: 'token_hash' })
  @Index()
  tokenHash: string;

  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  @Index()
  status: InvitationStatus;

  @Column({ name: 'expires_at' })
  @Index()
  expiresAt: Date;

  @Column({ name: 'accepted_at', nullable: true })
  acceptedAt?: Date;

  @Column({ name: 'accepted_by_user_id', nullable: true })
  acceptedByUserId?: string;

  @Column({ name: 'revoked_at', nullable: true })
  revokedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

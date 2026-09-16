// src/modules/users/entities/user.entity.ts
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
import {
  UserRole,
  AdminScopeLevel,
} from '../../../common/interfaces/auth-context.interface';

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

@Entity('users')
@Index(['authProvider', 'authProviderUserId'], { unique: true })
@Index(['organizationId', 'email'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // The Identity Provider identifier e.g. 'oidc', 'auth0', 'cognito', 'clerk', 'supabase', 'legacy'
  @Column({ name: 'auth_provider', default: 'oidc' })
  authProvider: string;

  // The subject identifier in the IdP token e.g. 'auth0|64fa...', 'usr_clerk_123', or sub
  @Column({ name: 'auth_provider_user_id' })
  authProviderUserId: string;

  @Column()
  @Index()
  email: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ name: 'organization_id', nullable: true })
  @Index()
  organizationId?: string;

  @ManyToOne(() => Organization, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @Column({ name: 'merchant_id', nullable: true })
  @Index()
  merchantId?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column('simple-array', { default: '*' })
  permissions: string[];

  // Scoped authority level (PLATFORM, ORGANIZATION, MERCHANT, LOCATION, DEVICE)
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

  @Column({ name: 'is_platform_admin', default: false })
  @Index()
  isPlatformAdmin: boolean;

  @Column({ name: 'invited_by_user_id', nullable: true })
  invitedByUserId?: string;

  @Column({ name: 'invitation_id', nullable: true })
  invitationId?: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  metadata: Record<string, any>;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

// src/modules/audit/entities/audit-log.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditActorType {
  USER = 'user',
  API_KEY = 'api_key',
  DEVICE = 'device',
  SYSTEM = 'system',
}

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', nullable: true })
  @Index()
  organizationId?: string;

  @Column({
    name: 'actor_type',
    type: 'enum',
    enum: AuditActorType,
    default: AuditActorType.USER,
  })
  actorType: AuditActorType;

  @Column({ name: 'actor_id', nullable: true })
  actorId?: string;

  @Column()
  action: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id', nullable: true })
  @Index()
  resourceId?: string;

  @Column({ name: 'ip_address', nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent?: string;

  @Column({ type: 'jsonb', nullable: true, default: {} })
  details: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}

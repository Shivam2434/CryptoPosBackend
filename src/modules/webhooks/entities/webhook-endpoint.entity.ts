// src/modules/webhooks/entities/webhook-endpoint.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WebhookEndpointStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
}

@Entity('webhook_endpoints')
export class WebhookEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id' })
  @Index()
  organizationId: string;

  @Column()
  url: string;

  // HMAC SHA-256 signing secret e.g. "whsec_..."
  @Column()
  secret: string;

  @Column('simple-array', { default: '*' })
  events: string[];

  @Column({
    type: 'enum',
    enum: WebhookEndpointStatus,
    default: WebhookEndpointStatus.ACTIVE,
  })
  status: WebhookEndpointStatus;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

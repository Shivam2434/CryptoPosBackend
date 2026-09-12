// src/modules/webhooks/entities/webhook-delivery.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    Index,
} from 'typeorm';

export enum WebhookDeliveryStatus {
    PENDING = 'pending',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('webhook_deliveries')
export class WebhookDelivery {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    @Index()
    organizationId: string;

    @Column({ name: 'endpoint_id' })
    @Index()
    endpointId: string;

    @Column({ name: 'event_type' })
    eventType: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, any>;

    @Column({ nullable: true })
    signature?: string;

    @Column({
        type: 'enum',
        enum: WebhookDeliveryStatus,
        default: WebhookDeliveryStatus.PENDING,
    })
    @Index()
    status: WebhookDeliveryStatus;

    @Column({ default: 0 })
    attempts: number;

    @Column({ name: 'max_attempts', default: 5 })
    maxAttempts: number;

    @Column({ name: 'next_retry_at', nullable: true })
    nextRetryAt?: Date;

    @Column({ name: 'http_status_code', nullable: true })
    httpStatusCode?: number;

    @Column({ name: 'response_body', type: 'text', nullable: true })
    responseBody?: string;

    @Column({ nullable: true })
    error?: string;

    @CreateDateColumn({ name: 'created_at' })
    @Index()
    createdAt: Date;

    @Column({ name: 'delivered_at', nullable: true })
    deliveredAt?: Date;
}

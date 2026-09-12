// src/modules/api-keys/entities/api-key.entity.ts
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum ApiKeyType {
    PUBLISHABLE = 'publishable',
    SECRET = 'secret',
}

export enum ApiKeyEnvironment {
    LIVE = 'live',
    TEST = 'test',
}

@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'organization_id' })
    @Index()
    organizationId: string;

    @Column()
    name: string;

    // Display prefix e.g. "sk_live_9a3f..."
    @Column({ name: 'key_prefix' })
    keyPrefix: string;

    // SHA-256 hash of complete API key secret
    @Column({ name: 'key_hash', unique: true })
    @Index()
    keyHash: string;

    @Column({
        type: 'enum',
        enum: ApiKeyType,
        default: ApiKeyType.SECRET,
    })
    keyType: ApiKeyType;

    @Column({
        type: 'enum',
        enum: ApiKeyEnvironment,
        default: ApiKeyEnvironment.LIVE,
    })
    environment: ApiKeyEnvironment;

    @Column('simple-array', { default: '*' })
    scopes: string[];

    @Column({ name: 'last_used_at', nullable: true })
    lastUsedAt?: Date;

    @Column({ name: 'expires_at', nullable: true })
    expiresAt?: Date;

    @Column({ name: 'revoked_at', nullable: true })
    revokedAt?: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}

// src/modules/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditActorType } from './entities/audit-log.entity';

export interface RecordAuditParams {
    organizationId: string;
    actorType: AuditActorType;
    actorId?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
    ) { }

    async log(params: RecordAuditParams): Promise<void> {
        try {
            const audit = this.auditRepo.create({
                ...params,
                details: params.details || {},
            });
            await this.auditRepo.save(audit);
            this.logger.log(`Audit: [${params.action}] Org: ${params.organizationId} Resource: ${params.resourceType}:${params.resourceId || 'N/A'}`);
        } catch (error) {
            this.logger.error(`Failed to record audit log: ${error.message}`);
        }
    }

    async getLogsForOrg(organizationId: string, limit = 50): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}

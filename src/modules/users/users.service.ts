// src/modules/users/users.service.ts
import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { UserRole } from '../../common/interfaces/auth-context.interface';
import { AuditService } from '../audit/audit.service';
import { AuditActorType } from '../audit/entities/audit-log.entity';

export interface ProvisionIdentityParams {
    provider: string;
    providerUserId: string;
    email: string;
    name?: string;
}

@Injectable()
export class UsersService {
    private readonly logger = new Logger(UsersService.name);

    constructor(
        @InjectRepository(User)
        private usersRepo: Repository<User>,
        private orgsService: OrganizationsService,
        private auditService: AuditService,
    ) { }

    async findOrCreateFromIdentity(
        identity: ProvisionIdentityParams,
        organizationIdOrSlug?: string,
    ): Promise<User> {
        // 1. Check existing user by provider identity
        let user = await this.usersRepo.findOne({
            where: {
                authProvider: identity.provider,
                authProviderUserId: identity.providerUserId,
            },
            relations: ['organization'],
        });

        if (user) {
            // Update last login timestamp
            user.lastLoginAt = new Date();
            if (identity.name && !user.name) user.name = identity.name;
            return this.usersRepo.save(user);
        }

        // 2. Check if user already exists by email (link external provider)
        user = await this.usersRepo.findOne({
            where: { email: identity.email },
            relations: ['organization'],
        });

        if (user) {
            user.authProvider = identity.provider;
            user.authProviderUserId = identity.providerUserId;
            user.lastLoginAt = new Date();
            if (identity.name && !user.name) user.name = identity.name;
            this.logger.log(`Linked existing user ${user.id} (${user.email}) to IdP: ${identity.provider}/${identity.providerUserId}`);
            return this.usersRepo.save(user);
        }

        // 3. First-time provisioning: resolve or create organization
        let organizationId = organizationIdOrSlug;
        let isOwner = false;

        if (organizationId) {
            const existingOrg = await this.orgsService.findById(organizationId).catch(() => null);
            if (!existingOrg) {
                const orgBySlug = await this.orgsService.findBySlug(organizationId);
                organizationId = orgBySlug?.id;
            }
        }

        if (!organizationId) {
            // Provision default organization for this new user
            const orgName = identity.name ? `${identity.name}'s Organization` : `${identity.email.split('@')[0]}'s Organization`;
            const newOrg = await this.orgsService.create({
                name: orgName,
                billingEmail: identity.email,
            });
            organizationId = newOrg.id;
            isOwner = true;
        }

        const newUser = this.usersRepo.create({
            authProvider: identity.provider,
            authProviderUserId: identity.providerUserId,
            email: identity.email,
            name: identity.name,
            organizationId,
            role: isOwner ? UserRole.OWNER : UserRole.ADMIN,
            permissions: ['*'],
            status: UserStatus.ACTIVE,
            lastLoginAt: new Date(),
        });

        const savedUser = await this.usersRepo.save(newUser);
        this.logger.log(`Provisioned new user: ${savedUser.id} (${savedUser.email}) for Org: ${organizationId}`);

        // Audit trail
        this.auditService.log({
            organizationId,
            actorType: AuditActorType.SYSTEM,
            actorId: savedUser.id,
            action: 'user.provisioned',
            resourceType: 'user',
            resourceId: savedUser.id,
            details: {
                provider: identity.provider,
                email: identity.email,
                role: savedUser.role,
            },
        }).catch(() => {});

        return this.findById(savedUser.id);
    }

    async findById(id: string): Promise<User> {
        const user = await this.usersRepo.findOne({
            where: { id },
            relations: ['organization'],
        });
        if (!user) throw new NotFoundException(`User not found with ID: ${id}`);
        return user;
    }

    async findByProviderIdentity(provider: string, providerUserId: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { authProvider: provider, authProviderUserId: providerUserId },
            relations: ['organization'],
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.usersRepo.findOne({
            where: { email },
            relations: ['organization'],
        });
    }

    async findByOrganization(organizationId: string): Promise<User[]> {
        return this.usersRepo.find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
        });
    }

    async create(organizationId: string, dto: CreateUserDto): Promise<User> {
        const existing = await this.findByEmail(dto.email);
        if (existing) throw new ConflictException(`User with email ${dto.email} already exists`);

        const user = this.usersRepo.create({
            ...dto,
            organizationId,
            authProvider: dto.authProvider || 'oidc',
            authProviderUserId: dto.authProviderUserId || `pending_${Date.now()}`,
            role: dto.role || UserRole.ADMIN,
            permissions: dto.permissions || ['*'],
            status: dto.status || UserStatus.ACTIVE,
        });

        return this.usersRepo.save(user);
    }

    async update(organizationId: string, id: string, dto: UpdateUserDto): Promise<User> {
        const user = await this.findById(id);
        if (user.organizationId !== organizationId) {
            throw new NotFoundException(`User not found in organization`);
        }
        Object.assign(user, dto);
        return this.usersRepo.save(user);
    }

    async delete(organizationId: string, id: string): Promise<{ success: boolean }> {
        const user = await this.findById(id);
        if (user.organizationId !== organizationId) {
            throw new NotFoundException(`User not found in organization`);
        }
        user.status = UserStatus.SUSPENDED;
        await this.usersRepo.save(user);
        return { success: true };
    }
}

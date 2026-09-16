// src/modules/admin/admin.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  AdminInvitation,
  InvitationStatus,
} from './entities/admin-invitation.entity';
import { Role } from './entities/role.entity';
import { AuditService } from '../audit/audit.service';
import { AuditActorType } from '../audit/entities/audit-log.entity';
import {
  AuthContext,
  UserRole,
  AdminScopeLevel,
} from '../../common/interfaces/auth-context.interface';
import { PlatformPermission } from '../../common/constants/permissions.constant';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(AdminInvitation)
    private invitationsRepo: Repository<AdminInvitation>,
    @InjectRepository(Role)
    private rolesRepo: Repository<Role>,
    private auditService: AuditService,
  ) {}

  // ==========================================
  // 1. INVITATIONS MANAGEMENT
  // ==========================================

  async inviteAdmin(
    dto: InviteAdminDto,
    inviterAuth: AuthContext,
  ): Promise<{ invitation: AdminInvitation; token: string }> {
    const email = dto.email.toLowerCase().trim();

    // Check if an active platform admin with this email already exists
    const existingAdmin = await this.usersRepo.findOne({
      where: { email, isPlatformAdmin: true, status: UserStatus.ACTIVE },
    });
    if (existingAdmin) {
      throw new ConflictException(
        `An active platform admin already exists with email '${email}'`,
      );
    }

    // Escalation prevention: Check inviter privileges if not Super Admin
    const isInviterSuperAdmin =
      inviterAuth.isSuperAdmin || inviterAuth.role === UserRole.SUPER_ADMIN;

    if (!isInviterSuperAdmin) {
      if (dto.role === UserRole.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Sub-admins cannot invite or create Super Admins',
        );
      }

      // Scope level escalation check
      if (
        inviterAuth.scopeLevel === AdminScopeLevel.ORGANIZATION &&
        dto.scopeLevel === AdminScopeLevel.PLATFORM
      ) {
        throw new ForbiddenException(
          'Cannot grant PLATFORM scope from an ORGANIZATION-scoped admin account',
        );
      }

      // Permissions escalation check
      if (dto.permissions && dto.permissions.length > 0) {
        const inviterPerms = inviterAuth.permissions || [];
        if (!inviterPerms.includes('*')) {
          const unauthorizedPerms = dto.permissions.filter(
            (p) =>
              !inviterPerms.includes(p) &&
              !inviterPerms.includes(p.split('.')[0] + '.*'),
          );
          if (unauthorizedPerms.length > 0) {
            throw new ForbiddenException(
              `Cannot grant permissions you do not possess: [${unauthorizedPerms.join(', ')}]`,
            );
          }
        }
      }

      // Organization scope escalation check
      if (dto.scopedOrganizationIds && dto.scopedOrganizationIds.length > 0) {
        const inviterOrgs =
          inviterAuth.scopedOrganizationIds ||
          (inviterAuth.organizationId ? [inviterAuth.organizationId] : []);
        const unauthorizedOrgs = dto.scopedOrganizationIds.filter(
          (id) => !inviterOrgs.includes(id),
        );
        if (unauthorizedOrgs.length > 0) {
          throw new ForbiddenException(
            `Cannot grant access to organizations you do not administer: [${unauthorizedOrgs.join(', ')}]`,
          );
        }
      }
    }

    // Revoke any pending invitations for this email
    await this.invitationsRepo.update(
      { email, status: InvitationStatus.PENDING },
      { status: InvitationStatus.REVOKED, revokedAt: new Date() },
    );

    // Generate 32-byte cryptographic raw token and compute SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Invitation expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = this.invitationsRepo.create({
      email,
      invitedByUserId: inviterAuth.userId || 'system',
      roleId: dto.roleId || dto.role || UserRole.SUB_ADMIN,
      permissions:
        dto.permissions ||
        (dto.role === UserRole.SUPER_ADMIN
          ? ['*']
          : [
              PlatformPermission.PAYMENTS_READ,
              PlatformPermission.ORGANIZATIONS_READ,
            ]),
      scopeLevel: dto.scopeLevel || AdminScopeLevel.PLATFORM,
      scopedOrganizationIds: dto.scopedOrganizationIds || [],
      scopedMerchantIds: dto.scopedMerchantIds || [],
      tokenHash,
      status: InvitationStatus.PENDING,
      expiresAt,
    });

    const savedInvitation = await this.invitationsRepo.save(invitation);

    // Audit log
    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: inviterAuth.userId,
      action: 'admin.invitation.created',
      resourceType: 'admin_invitation',
      resourceId: savedInvitation.id,
      details: {
        inviteeEmail: email,
        role: invitation.roleId,
        scopeLevel: invitation.scopeLevel,
        scopedOrganizationIds: invitation.scopedOrganizationIds,
      },
    });

    return {
      invitation: savedInvitation,
      token: rawToken, // Returned strictly once for email/link dispatch
    };
  }

  async acceptInvitation(
    dto: AcceptInvitationDto,
    callerAuth?: AuthContext,
  ): Promise<{ user: User; message: string }> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(dto.token.trim())
      .digest('hex');

    const invitation = await this.invitationsRepo.findOne({
      where: { tokenHash, status: InvitationStatus.PENDING },
    });

    if (!invitation) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = InvitationStatus.EXPIRED;
      await this.invitationsRepo.save(invitation);
      throw new BadRequestException('This invitation has expired');
    }

    // Determine Identity Provider credentials
    const authProvider = dto.authProvider || callerAuth?.authProvider || 'oidc';
    const authProviderUserId =
      dto.authProviderUserId ||
      callerAuth?.externalIdentityId ||
      `sub_${crypto.randomUUID()}`;

    // Find existing user or create a new user record
    let user = await this.usersRepo.findOne({
      where: [
        { email: invitation.email },
        { authProvider, authProviderUserId },
      ],
    });

    const targetRole =
      invitation.roleId === (UserRole.SUPER_ADMIN as string)
        ? UserRole.SUPER_ADMIN
        : UserRole.SUB_ADMIN;

    if (!user) {
      user = this.usersRepo.create({
        email: invitation.email,
        name: dto.name || invitation.email.split('@')[0],
        authProvider,
        authProviderUserId,
        role: targetRole,
        permissions: invitation.permissions,
        scopeLevel: invitation.scopeLevel,
        scopedOrganizationIds: invitation.scopedOrganizationIds,
        scopedMerchantIds: invitation.scopedMerchantIds,
        isPlatformAdmin: true,
        invitedByUserId: invitation.invitedByUserId,
        invitationId: invitation.id,
        status: UserStatus.ACTIVE,
      });
    } else {
      // Update existing user into platform admin
      user.role = targetRole;
      user.permissions = invitation.permissions;
      user.scopeLevel = invitation.scopeLevel;
      user.scopedOrganizationIds = invitation.scopedOrganizationIds;
      user.scopedMerchantIds = invitation.scopedMerchantIds;
      user.isPlatformAdmin = true;
      user.invitedByUserId = invitation.invitedByUserId;
      user.invitationId = invitation.id;
      user.status = UserStatus.ACTIVE;
      if (dto.name) user.name = dto.name;
    }

    const savedUser = await this.usersRepo.save(user);

    // Mark invitation as ACCEPTED
    invitation.status = InvitationStatus.ACCEPTED;
    invitation.acceptedAt = new Date();
    invitation.acceptedByUserId = savedUser.id;
    await this.invitationsRepo.save(invitation);

    // Audit log
    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: savedUser.id,
      action: 'admin.invitation.accepted',
      resourceType: 'user',
      resourceId: savedUser.id,
      details: {
        email: savedUser.email,
        invitationId: invitation.id,
        role: savedUser.role,
        scopeLevel: savedUser.scopeLevel,
      },
    });

    return {
      user: savedUser,
      message: 'Admin invitation successfully accepted',
    };
  }

  async listInvitations(
    status?: InvitationStatus,
    page = 1,
    limit = 20,
  ): Promise<{
    data: AdminInvitation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const skip = (page - 1) * limit;
    const qb = this.invitationsRepo.createQueryBuilder('inv');

    if (status) {
      qb.where('inv.status = :status', { status });
    }

    qb.orderBy('inv.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async revokeInvitation(
    id: string,
    actorAuth: AuthContext,
  ): Promise<AdminInvitation> {
    const invitation = await this.invitationsRepo.findOne({ where: { id } });
    if (!invitation) {
      throw new NotFoundException(`Invitation with ID '${id}' not found`);
    }

    invitation.status = InvitationStatus.REVOKED;
    invitation.revokedAt = new Date();
    const saved = await this.invitationsRepo.save(invitation);

    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: actorAuth.userId,
      action: 'admin.invitation.revoked',
      resourceType: 'admin_invitation',
      resourceId: id,
      details: { email: invitation.email },
    });

    return saved;
  }

  // ==========================================
  // 2. ADMIN ACCOUNTS MANAGEMENT
  // ==========================================

  async listAdmins(
    query: AdminQueryDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.usersRepo
      .createQueryBuilder('user')
      .where(
        'user.isPlatformAdmin = :isPlatformAdmin OR user.role IN (:...roles)',
        {
          isPlatformAdmin: true,
          roles: [UserRole.SUPER_ADMIN, UserRole.SUB_ADMIN],
        },
      );

    if (query.status) {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.scopeLevel) {
      qb.andWhere('user.scopeLevel = :scopeLevel', {
        scopeLevel: query.scopeLevel,
      });
    }

    if (query.search) {
      qb.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async getAdminById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
    });

    if (
      !user ||
      (!user.isPlatformAdmin &&
        user.role !== UserRole.SUPER_ADMIN &&
        user.role !== UserRole.SUB_ADMIN)
    ) {
      throw new NotFoundException(`Admin with ID '${id}' not found`);
    }

    return user;
  }

  async updateAdmin(
    id: string,
    dto: UpdateAdminDto,
    actorAuth: AuthContext,
  ): Promise<User> {
    const admin = await this.getAdminById(id);
    const isActorSuperAdmin =
      actorAuth.isSuperAdmin || actorAuth.role === UserRole.SUPER_ADMIN;

    // Sub Admins cannot modify Super Admins
    if (admin.role === UserRole.SUPER_ADMIN && !isActorSuperAdmin) {
      throw new ForbiddenException(
        'Only Super Admins can modify Super Admin accounts',
      );
    }

    // Sub Admins cannot promote anyone to Super Admin
    if (dto.role === UserRole.SUPER_ADMIN && !isActorSuperAdmin) {
      throw new ForbiddenException(
        'Sub-admins cannot promote users to Super Admin',
      );
    }

    if (dto.name !== undefined) admin.name = dto.name;
    if (dto.role !== undefined) admin.role = dto.role;
    if (dto.permissions !== undefined) admin.permissions = dto.permissions;
    if (dto.scopeLevel !== undefined) admin.scopeLevel = dto.scopeLevel;
    if (dto.scopedOrganizationIds !== undefined)
      admin.scopedOrganizationIds = dto.scopedOrganizationIds;
    if (dto.scopedMerchantIds !== undefined)
      admin.scopedMerchantIds = dto.scopedMerchantIds;
    if (dto.status !== undefined) admin.status = dto.status;

    const updated = await this.usersRepo.save(admin);

    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: actorAuth.userId,
      action: 'admin.user.updated',
      resourceType: 'user',
      resourceId: id,
      details: { updatedFields: dto },
    });

    return updated;
  }

  async deactivateAdmin(id: string, actorAuth: AuthContext): Promise<User> {
    const admin = await this.getAdminById(id);

    // Protection: Ensure we never deactivate the last active Super Admin
    if (admin.role === UserRole.SUPER_ADMIN) {
      const activeSuperAdmins = await this.usersRepo.count({
        where: {
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      });

      if (activeSuperAdmins <= 1) {
        throw new BadRequestException(
          'Cannot deactivate the last active Super Admin',
        );
      }
    }

    admin.status = UserStatus.SUSPENDED;
    const saved = await this.usersRepo.save(admin);

    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: actorAuth.userId,
      action: 'admin.user.deactivated',
      resourceType: 'user',
      resourceId: id,
      details: { email: admin.email },
    });

    return saved;
  }

  async activateAdmin(id: string, actorAuth: AuthContext): Promise<User> {
    const admin = await this.getAdminById(id);
    admin.status = UserStatus.ACTIVE;
    const saved = await this.usersRepo.save(admin);

    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: actorAuth.userId,
      action: 'admin.user.activated',
      resourceType: 'user',
      resourceId: id,
      details: { email: admin.email },
    });

    return saved;
  }

  // ==========================================
  // 3. ROLES & PERMISSIONS MANAGEMENT
  // ==========================================

  async listRoles(): Promise<Role[]> {
    return this.rolesRepo.find({ order: { name: 'ASC' } });
  }

  async createRole(dto: CreateRoleDto, actorAuth: AuthContext): Promise<Role> {
    const roleName = dto.name.toUpperCase().trim();
    const existing = await this.rolesRepo.findOne({
      where: { name: roleName },
    });
    if (existing) {
      throw new ConflictException(
        `Role with name '${roleName}' already exists`,
      );
    }

    const role = this.rolesRepo.create({
      name: roleName,
      description: dto.description,
      permissions: dto.permissions,
      isSystem: false,
    });

    const saved = await this.rolesRepo.save(role);

    await this.auditService.log({
      actorType: AuditActorType.USER,
      actorId: actorAuth.userId,
      action: 'admin.role.created',
      resourceType: 'role',
      resourceId: saved.id,
      details: { roleName, permissions: dto.permissions },
    });

    return saved;
  }

  listAvailablePermissions(): { category: string; permissions: string[] }[] {
    const allPermissions = Object.values(PlatformPermission);
    const categories: Record<string, string[]> = {};

    for (const perm of allPermissions) {
      const prefix = perm.includes('.') ? perm.split('.')[0] : 'general';
      if (!categories[prefix]) {
        categories[prefix] = [];
      }
      categories[prefix].push(perm);
    }

    return Object.entries(categories).map(([category, permissions]) => ({
      category,
      permissions,
    }));
  }
}

// src/modules/admin/admin.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { AdminService } from './admin.service';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  AdminInvitation,
  InvitationStatus,
} from './entities/admin-invitation.entity';
import { Role } from './entities/role.entity';
import { AuditService } from '../audit/audit.service';
import {
  UserRole,
  AdminScopeLevel,
  AuthContext,
} from '../../common/interfaces/auth-context.interface';
import { PlatformPermission } from '../../common/constants/permissions.constant';

describe('AdminService', () => {
  let service: AdminService;
  let usersRepo: jest.Mocked<Repository<User>>;
  let invitationsRepo: jest.Mocked<Repository<AdminInvitation>>;
  let _rolesRepo: jest.Mocked<Repository<Role>>;
  let auditService: jest.Mocked<AuditService>;

  const mockSuperAdminAuth: AuthContext = {
    userId: 'super-admin-uuid',
    email: 'superadmin@cryptopos.io',
    role: UserRole.SUPER_ADMIN,
    isSuperAdmin: true,
    isPlatformAdmin: true,
    scopeLevel: AdminScopeLevel.PLATFORM,
    scopes: ['*'],
    permissions: ['*'],
    environment: 'live',
    authType: 'jwt',
  };

  const mockSubAdminAuth: AuthContext = {
    userId: 'sub-admin-uuid',
    email: 'subadmin@cryptopos.io',
    role: UserRole.SUB_ADMIN,
    isSuperAdmin: false,
    isPlatformAdmin: true,
    scopeLevel: AdminScopeLevel.ORGANIZATION,
    scopedOrganizationIds: ['org-allowed-1'],
    scopes: ['payments.read', 'organizations.read'],
    permissions: ['payments.read', 'organizations.read'],
    environment: 'live',
    authType: 'jwt',
  };

  beforeEach(async () => {
    const mockUsersRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'new-user-uuid', ...dto })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: entity.id || 'saved-user-uuid', ...entity }),
        ),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockInvitationsRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'new-inv-uuid', ...dto })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: entity.id || 'saved-inv-uuid', ...entity }),
        ),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(),
    };

    const mockRolesRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest
        .fn()
        .mockImplementation((dto) => ({ id: 'new-role-uuid', ...dto })),
      save: jest
        .fn()
        .mockImplementation((entity) =>
          Promise.resolve({ id: entity.id || 'saved-role-uuid', ...entity }),
        ),
    };

    const mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
      queryLogs: jest.fn(),
      getLogsForOrg: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        {
          provide: getRepositoryToken(AdminInvitation),
          useValue: mockInvitationsRepo,
        },
        { provide: getRepositoryToken(Role), useValue: mockRolesRepo },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    usersRepo = module.get(getRepositoryToken(User));
    invitationsRepo = module.get(getRepositoryToken(AdminInvitation));
    _rolesRepo = module.get(getRepositoryToken(Role));
    auditService = module.get(AuditService);
  });

  describe('inviteAdmin', () => {
    it('should successfully generate an invitation with a raw cryptographic token', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      const result = await service.inviteAdmin(
        {
          email: 'newadmin@example.com',
          scopeLevel: AdminScopeLevel.PLATFORM,
          permissions: [PlatformPermission.PAYMENTS_READ],
        },
        mockSuperAdminAuth,
      );

      expect(result).toHaveProperty('invitation');
      expect(result).toHaveProperty('token');
      expect(typeof result.token).toBe('string');
      expect(result.token.length).toBe(64); // 32 bytes hex
      expect(invitationsRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.invitation.created' }),
      );
    });

    it('should reject if inviter is sub-admin trying to invite Super Admin (escalation prevention)', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.inviteAdmin(
          {
            email: 'supercandidate@example.com',
            role: UserRole.SUPER_ADMIN,
            scopeLevel: AdminScopeLevel.PLATFORM,
          },
          mockSubAdminAuth,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject if inviter is sub-admin trying to grant permissions they lack', async () => {
      usersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.inviteAdmin(
          {
            email: 'newadmin@example.com',
            scopeLevel: AdminScopeLevel.ORGANIZATION,
            scopedOrganizationIds: ['org-allowed-1'],
            permissions: [PlatformPermission.ADMINS_WRITE], // Sub admin does not have this
          },
          mockSubAdminAuth,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept valid invitation and provision/activate platform admin', async () => {
      const rawToken =
        'sampletoken123456789012345678901234567890123456789012345678901234';
      const tokenHash = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      const pendingInv: Partial<AdminInvitation> = {
        id: 'inv-uuid',
        email: 'invited@example.com',
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 1000000),
        roleId: UserRole.SUB_ADMIN,
        permissions: ['payments.read'],
        scopeLevel: AdminScopeLevel.ORGANIZATION,
        scopedOrganizationIds: ['org-1'],
        scopedMerchantIds: [],
        invitedByUserId: 'super-admin-uuid',
      };

      invitationsRepo.findOne.mockResolvedValue(pendingInv as AdminInvitation);
      usersRepo.findOne.mockResolvedValue(null);

      const result = await service.acceptInvitation({
        token: rawToken,
        name: 'Invited Admin',
        authProvider: 'oidc',
        authProviderUserId: 'auth0|12345',
      });

      expect(result.user).toBeDefined();
      expect(result.user.isPlatformAdmin).toBe(true);
      expect(result.user.role).toBe(UserRole.SUB_ADMIN);
      expect(invitationsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.invitation.accepted' }),
      );
    });
  });

  describe('deactivateAdmin', () => {
    it('should prevent deactivating the last active Super Admin', async () => {
      const superAdminUser: Partial<User> = {
        id: 'super-admin-1',
        email: 'super@crypto.io',
        role: UserRole.SUPER_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      };

      usersRepo.findOne.mockResolvedValue(superAdminUser as User);
      usersRepo.count.mockResolvedValue(1); // Only 1 active super admin

      await expect(
        service.deactivateAdmin('super-admin-1', mockSuperAdminAuth),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully deactivate sub-admin', async () => {
      const subAdminUser: Partial<User> = {
        id: 'sub-admin-1',
        email: 'sub@crypto.io',
        role: UserRole.SUB_ADMIN,
        isPlatformAdmin: true,
        status: UserStatus.ACTIVE,
      };

      usersRepo.findOne.mockResolvedValue(subAdminUser as User);

      const result = await service.deactivateAdmin(
        'sub-admin-1',
        mockSuperAdminAuth,
      );
      expect(result.status).toBe(UserStatus.SUSPENDED);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'admin.user.deactivated' }),
      );
    });
  });
});

// src/modules/users/users.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User, UserStatus } from './entities/user.entity';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import {
  UserRole,
  AdminScopeLevel,
} from '../../common/interfaces/auth-context.interface';

describe('UsersService', () => {
  let service: UsersService;
  let mockUsersRepo: any;
  let mockOrgsService: any;
  let mockAuditService: any;

  const mockOrg = {
    id: 'org-uuid-1',
    name: "Alice's Organization",
    slug: 'alices-organization',
  };

  const mockUser: User = {
    id: 'user-uuid-1',
    authProvider: 'auth0',
    authProviderUserId: 'auth0|12345',
    email: 'alice@domain.com',
    name: 'Alice Owner',
    organizationId: 'org-uuid-1',
    role: UserRole.OWNER,
    permissions: ['*'],
    scopeLevel: AdminScopeLevel.ORGANIZATION,
    scopedOrganizationIds: [],
    scopedMerchantIds: [],
    isPlatformAdmin: false,
    status: UserStatus.ACTIVE,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockUsersRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ id: 'new-user-uuid', ...dto })),
      save: jest.fn((user) => Promise.resolve(user)),
    };

    mockOrgsService = {
      findById: jest.fn().mockResolvedValue(mockOrg),
      findBySlug: jest.fn().mockResolvedValue(mockOrg),
      create: jest.fn().mockResolvedValue(mockOrg),
    };

    mockAuditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepo,
        },
        {
          provide: OrganizationsService,
          useValue: mockOrgsService,
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateFromIdentity', () => {
    it('should return existing user if found by provider identity', async () => {
      mockUsersRepo.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.findOrCreateFromIdentity({
        provider: 'auth0',
        providerUserId: 'auth0|12345',
        email: 'alice@domain.com',
      });

      expect(result.id).toBe(mockUser.id);
      expect(mockUsersRepo.save).toHaveBeenCalled();
    });

    it('should link existing user found by email to new provider identity', async () => {
      const existingEmailUser = {
        ...mockUser,
        authProvider: 'legacy',
        authProviderUserId: 'legacy-123',
      };
      // First call (by provider) returns null, second call (by email) returns existingEmailUser
      mockUsersRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existingEmailUser);

      const result = await service.findOrCreateFromIdentity({
        provider: 'cognito',
        providerUserId: 'cognito|9999',
        email: 'alice@domain.com',
      });

      expect(result.authProvider).toBe('cognito');
      expect(result.authProviderUserId).toBe('cognito|9999');
      expect(mockUsersRepo.save).toHaveBeenCalled();
    });

    it('should provision new organization and user for first-time login', async () => {
      mockUsersRepo.findOne
        .mockResolvedValueOnce(null) // by provider
        .mockResolvedValueOnce(null) // by email
        .mockResolvedValueOnce({ ...mockUser, id: 'new-user-uuid' }); // findById after creation

      const result = await service.findOrCreateFromIdentity({
        provider: 'auth0',
        providerUserId: 'auth0|first-login',
        email: 'newbie@domain.com',
        name: 'Newbie User',
      });

      expect(mockOrgsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ billingEmail: 'newbie@domain.com' }),
      );
      expect(mockUsersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.OWNER,
          status: UserStatus.ACTIVE,
        }),
      );
      expect(result).toBeDefined();
    });
  });

  describe('user management', () => {
    it('should find user by id', async () => {
      mockUsersRepo.findOne.mockResolvedValueOnce(mockUser);
      const user = await service.findById('user-uuid-1');
      expect(user.id).toBe('user-uuid-1');
    });

    it('should soft delete user by setting status to suspended', async () => {
      mockUsersRepo.findOne.mockResolvedValueOnce({
        ...mockUser,
        organizationId: 'org-uuid-1',
      });
      const result = await service.delete('org-uuid-1', 'user-uuid-1');
      expect(result.success).toBe(true);
      expect(mockUsersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: UserStatus.SUSPENDED }),
      );
    });
  });
});

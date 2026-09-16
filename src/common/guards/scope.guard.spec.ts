// src/common/guards/scope.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ScopeGuard } from './scope.guard';
import {
  AdminScopeLevel,
  UserRole,
} from '../interfaces/auth-context.interface';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (
    authContext: any,
    params: any = {},
    query: any = {},
    body: any = {},
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          auth: authContext,
          params,
          query,
          body,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new ScopeGuard(reflector);
  });

  it('should allow access if no specific scope is required and no resource target requested', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Super Admin regardless of scope and target org', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(AdminScopeLevel.PLATFORM);
    const context = createMockExecutionContext(
      { isSuperAdmin: true, role: UserRole.SUPER_ADMIN },
      { orgId: 'random-org-id' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Sub Admin with PLATFORM scope to access any target organization', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext(
      { scopeLevel: AdminScopeLevel.PLATFORM, role: UserRole.SUB_ADMIN },
      { orgId: 'org-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Sub Admin to access organization in their scopedOrganizationIds list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext(
      {
        scopeLevel: AdminScopeLevel.ORGANIZATION,
        scopedOrganizationIds: ['org-123', 'org-456'],
        role: UserRole.SUB_ADMIN,
      },
      { orgId: 'org-123' },
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if Sub Admin targets an unauthorized organization', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext(
      {
        scopeLevel: AdminScopeLevel.ORGANIZATION,
        scopedOrganizationIds: ['org-123'],
        role: UserRole.SUB_ADMIN,
      },
      { orgId: 'org-999' },
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if PLATFORM scope is required but user has ORGANIZATION scope', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(AdminScopeLevel.PLATFORM);
    const context = createMockExecutionContext({
      scopeLevel: AdminScopeLevel.ORGANIZATION,
      role: UserRole.SUB_ADMIN,
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

// src/common/guards/permissions.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';
import { UserRole } from '../interfaces/auth-context.interface';
import { PlatformPermission } from '../constants/permissions.constant';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  const createMockExecutionContext = (authContext: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          auth: authContext,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as any;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  it('should allow access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockExecutionContext(null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow Super Admin regardless of required permissions', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PlatformPermission.ADMINS_WRITE]);
    const context = createMockExecutionContext({
      isSuperAdmin: true,
      role: UserRole.SUPER_ADMIN,
      authType: 'jwt',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user with global wildcard * permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PlatformPermission.ADMINS_INVITE]);
    const context = createMockExecutionContext({
      role: UserRole.SUB_ADMIN,
      permissions: ['*'],
      authType: 'jwt',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user with domain wildcard e.g. payments.* for payments.read', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PlatformPermission.PAYMENTS_READ]);
    const context = createMockExecutionContext({
      role: UserRole.SUB_ADMIN,
      permissions: ['payments.*'],
      authType: 'jwt',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow user with exact permission match', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PlatformPermission.PAYMENTS_READ]);
    const context = createMockExecutionContext({
      role: UserRole.SUB_ADMIN,
      permissions: [PlatformPermission.PAYMENTS_READ],
      authType: 'jwt',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([PlatformPermission.ADMINS_INVITE]);
    const context = createMockExecutionContext({
      role: UserRole.SUB_ADMIN,
      permissions: [PlatformPermission.PAYMENTS_READ],
      authType: 'jwt',
    });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});

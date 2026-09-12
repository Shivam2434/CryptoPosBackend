// src/common/guards/roles.guard.spec.ts
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../interfaces/auth-context.interface';

describe('RolesGuard', () => {
    let guard: RolesGuard;
    let reflector: Reflector;

    const createMockExecutionContext = (authContext: any): ExecutionContext => ({
        switchToHttp: () => ({
            getRequest: () => ({
                auth: authContext,
            }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
    } as any);

    beforeEach(() => {
        reflector = new Reflector();
        guard = new RolesGuard(reflector);
    });

    it('should allow access if no roles are required', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
        const context = createMockExecutionContext(null);
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow OWNER role regardless of specified roles', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.MANAGER]);
        const context = createMockExecutionContext({
            role: UserRole.OWNER,
            authType: 'jwt',
        });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow user if their role matches the required roles', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN, UserRole.MANAGER]);
        const context = createMockExecutionContext({
            role: UserRole.MANAGER,
            authType: 'jwt',
        });
        expect(guard.canActivate(context)).toBe(true);
    });

    it('should forbid user if their role is not in the required roles', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({
            role: UserRole.CASHIER,
            authType: 'jwt',
        });
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should allow machine API keys with wildcard * scope', () => {
        jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.ADMIN]);
        const context = createMockExecutionContext({
            authType: 'api_key',
            scopes: ['*'],
        });
        expect(guard.canActivate(context)).toBe(true);
    });
});

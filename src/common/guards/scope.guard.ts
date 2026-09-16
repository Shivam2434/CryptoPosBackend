// src/common/guards/scope.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SCOPE_KEY } from '../decorators/scope.decorator';
import {
  AuthContext,
  AdminScopeLevel,
  UserRole,
} from '../interfaces/auth-context.interface';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScope = this.reflector.getAllAndOverride<AdminScopeLevel>(
      SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const auth: AuthContext = request.auth || request.user;

    if (!auth) {
      throw new ForbiddenException('Authentication context not found');
    }

    // 1. Super Admins always have unrestricted platform-wide access
    if (auth.isSuperAdmin || auth.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // 2. Machine API keys with full scopes
    if (
      auth.authType === 'api_key' &&
      (auth.scopes?.includes('*') || auth.scopes?.includes('all'))
    ) {
      return true;
    }

    // 3. If a specific scope level requirement is attached to route
    if (requiredScope) {
      if (
        requiredScope === AdminScopeLevel.PLATFORM &&
        auth.scopeLevel !== AdminScopeLevel.PLATFORM
      ) {
        throw new ForbiddenException(
          'Platform-level administrative scope required',
        );
      }
    }

    // 4. Extract target organizationId and merchantId from route parameters / query / body
    const targetOrgId =
      request.params?.orgId ||
      request.params?.organizationId ||
      request.query?.organizationId ||
      request.body?.organizationId;
    const targetMerchantId =
      request.params?.merchantId ||
      request.query?.merchantId ||
      request.body?.merchantId;

    // 5. If targeting a specific organization, verify scope
    if (targetOrgId) {
      if (auth.scopeLevel === AdminScopeLevel.PLATFORM) {
        return true;
      }

      const allowedOrgs =
        auth.scopedOrganizationIds ||
        (auth.organizationId ? [auth.organizationId] : []);
      if (!allowedOrgs.includes(targetOrgId)) {
        throw new ForbiddenException(
          `Access denied. You do not have permissions for organization '${targetOrgId}'`,
        );
      }
    }

    // 6. If targeting a specific merchant, verify scope
    if (targetMerchantId) {
      if (auth.scopeLevel === AdminScopeLevel.PLATFORM) {
        return true;
      }

      const allowedMerchants =
        auth.scopedMerchantIds || (auth.merchantId ? [auth.merchantId] : []);
      if (
        allowedMerchants.length > 0 &&
        !allowedMerchants.includes(targetMerchantId)
      ) {
        throw new ForbiddenException(
          `Access denied. You do not have permissions for merchant '${targetMerchantId}'`,
        );
      }
    }

    return true;
  }
}

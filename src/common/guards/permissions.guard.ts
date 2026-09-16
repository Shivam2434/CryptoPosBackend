// src/common/guards/permissions.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthContext, UserRole } from '../interfaces/auth-context.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const auth: AuthContext = request.auth || request.user;

    if (!auth) {
      throw new ForbiddenException('Authentication context not found');
    }

    // 1. Super Admin has unrestricted platform authority
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

    // 3. Check granular permissions
    const userPermissions = auth.permissions || [];
    if (userPermissions.includes('*')) {
      return true;
    }

    const hasAllRequired = requiredPermissions.every(
      (perm) =>
        userPermissions.includes(perm) ||
        userPermissions.includes(perm.split('.')[0] + '.*'),
    );

    if (hasAllRequired) {
      return true;
    }

    const missing = requiredPermissions.filter(
      (perm) =>
        !userPermissions.includes(perm) &&
        !userPermissions.includes(perm.split('.')[0] + '.*'),
    );

    throw new ForbiddenException(
      `Access denied. Missing required permission(s): [${missing.join(', ')}]`,
    );
  }
}

// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthContext, UserRole } from '../interfaces/auth-context.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const auth: AuthContext = request.auth || request.user;

    if (!auth) {
      throw new ForbiddenException('User authentication context not found');
    }

    // Super Admin and Owner role always have full access
    if (
      auth.isSuperAdmin ||
      auth.role === UserRole.SUPER_ADMIN ||
      auth.role === UserRole.OWNER
    ) {
      return true;
    }

    // Machine API keys with full scopes
    if (
      auth.authType === 'api_key' &&
      (auth.scopes?.includes('*') || auth.scopes?.includes('all'))
    ) {
      return true;
    }

    if (auth.role && requiredRoles.includes(auth.role)) {
      return true;
    }

    throw new ForbiddenException(
      `Access denied. Role '${auth.role}' is not authorized. Required: [${requiredRoles.join(', ')}]`,
    );
  }
}

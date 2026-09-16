// src/common/guards/composite-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { DeviceAuthGuard } from './device-auth.guard';

@Injectable()
export class CompositeAuthGuard implements CanActivate {
  constructor(
    private jwtGuard: JwtAuthGuard,
    private apiKeyGuard: ApiKeyAuthGuard,
    private deviceGuard: DeviceAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const apiKeyHeader = request.headers['x-api-key'];
    const deviceTokenHeader = request.headers['x-device-token'];

    // 1. If device token provided
    if (deviceTokenHeader) {
      return this.deviceGuard.canActivate(context);
    }

    // 2. If API Key header provided or Bearer contains sk_/pk_/cpk_
    if (
      apiKeyHeader ||
      (authHeader &&
        (authHeader.includes('sk_') ||
          authHeader.includes('pk_') ||
          authHeader.includes('cpk_')))
    ) {
      return this.apiKeyGuard.canActivate(context);
    }

    // 3. Fallback to JWT Bearer authentication
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return this.jwtGuard.canActivate(context);
    }

    throw new UnauthorizedException(
      'Authentication credentials (Bearer token, X-Api-Key, or X-Device-Token) are required',
    );
  }
}

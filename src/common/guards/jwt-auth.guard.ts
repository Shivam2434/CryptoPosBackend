// src/common/guards/jwt-auth.guard.ts
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private authService: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader || typeof authHeader !== 'string') {
            throw new UnauthorizedException('Authorization header is missing');
        }

        if (!authHeader.startsWith('Bearer ')) {
            throw new UnauthorizedException('Authorization scheme must be Bearer token');
        }

        const token = authHeader.substring(7).trim();
        if (!token) {
            throw new UnauthorizedException('Bearer token is empty');
        }

        const orgHint = request.headers['x-organization-id'] || request.headers['x-tenant-id'];

        const authContext = await this.authService.authenticateBearerToken(token, orgHint as string);

        request.auth = authContext;
        request.user = authContext;

        return true;
    }
}
// src/common/decorators/current-tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthContext, Environment } from '../interfaces/auth-context.interface';

export const CurrentAuth = createParamDecorator(
    (data: keyof AuthContext | undefined, ctx: ExecutionContext): any => {
        const request = ctx.switchToHttp().getRequest();
        const auth: AuthContext = request.auth || request.user;
        if (!auth) return null;
        return data ? auth[data] : auth;
    },
);

export const CurrentOrg = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const request = ctx.switchToHttp().getRequest();
        const auth: AuthContext = request.auth || request.user;
        return auth?.organizationId;
    },
);

export const CurrentEnvironment = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): Environment => {
        const request = ctx.switchToHttp().getRequest();
        const auth: AuthContext = request.auth || request.user;
        return auth?.environment || 'live';
    },
);

export const CurrentLocation = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest();
        const auth: AuthContext = request.auth || request.user;
        return auth?.locationId;
    },
);

export const CurrentDevice = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string | undefined => {
        const request = ctx.switchToHttp().getRequest();
        const auth: AuthContext = request.auth || request.user;
        return auth?.deviceId;
    },
);

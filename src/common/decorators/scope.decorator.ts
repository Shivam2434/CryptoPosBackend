// src/common/decorators/scope.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { AdminScopeLevel } from '../interfaces/auth-context.interface';

export const SCOPE_KEY = 'required_scope';
export const RequireScope = (scopeLevel: AdminScopeLevel) =>
  SetMetadata(SCOPE_KEY, scopeLevel);

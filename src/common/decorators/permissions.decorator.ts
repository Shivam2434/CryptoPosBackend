// src/common/decorators/permissions.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { PlatformPermission } from '../constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (
  ...permissions: (PlatformPermission | string)[]
) => SetMetadata(PERMISSIONS_KEY, permissions);

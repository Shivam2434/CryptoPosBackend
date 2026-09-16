// src/modules/admin/dto/update-admin.dto.ts
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminScopeLevel,
  UserRole,
} from '../../../common/interfaces/auth-context.interface';
import { UserStatus } from '../../users/entities/user.entity';

export class UpdateAdminDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'role-uuid' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: ['organizations.read', 'payments.read'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ enum: AdminScopeLevel })
  @IsOptional()
  @IsEnum(AdminScopeLevel)
  scopeLevel?: AdminScopeLevel;

  @ApiPropertyOptional({
    example: ['org-uuid-1'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopedOrganizationIds?: string[];

  @ApiPropertyOptional({
    example: ['merchant-uuid-1'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopedMerchantIds?: string[];

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

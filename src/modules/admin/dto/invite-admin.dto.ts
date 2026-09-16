// src/modules/admin/dto/invite-admin.dto.ts
import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AdminScopeLevel,
  UserRole,
} from '../../../common/interfaces/auth-context.interface';

export class InviteAdminDto {
  @ApiProperty({
    example: 'subadmin@example.com',
    description: 'Email of the admin candidate',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Name of the admin candidate',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'custom-role-uuid',
    description: 'Role ID if assigning a predefined role',
  })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.SUB_ADMIN,
    description: 'Role assigned if roleId is not supplied',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    example: ['organizations.read', 'merchants.read', 'payments.read'],
    description: 'Granular permissions assigned to the admin',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiProperty({
    enum: AdminScopeLevel,
    default: AdminScopeLevel.PLATFORM,
    description:
      'Administrative scope level (PLATFORM, ORGANIZATION, MERCHANT)',
  })
  @IsEnum(AdminScopeLevel)
  scopeLevel: AdminScopeLevel;

  @ApiPropertyOptional({
    example: ['org-uuid-1', 'org-uuid-2'],
    description: 'Specific organization IDs if scopeLevel is ORGANIZATION',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopedOrganizationIds?: string[];

  @ApiPropertyOptional({
    example: ['merchant-uuid-1'],
    description: 'Specific merchant IDs if scopeLevel is MERCHANT',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scopedMerchantIds?: string[];
}

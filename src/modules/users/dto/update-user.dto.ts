// src/modules/users/dto/update-user.dto.ts
import { IsOptional, IsEnum, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/auth-context.interface';
import { UserStatus } from '../entities/user.entity';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John Smith' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ example: ['payments:read'] })
  @IsOptional()
  @IsArray()
  permissions?: string[];

  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ example: 'merchant-uuid-here' })
  @IsOptional()
  @IsString()
  merchantId?: string;
}

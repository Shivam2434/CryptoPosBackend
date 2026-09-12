// src/modules/users/dto/create-user.dto.ts
import { IsEmail, IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/interfaces/auth-context.interface';
import { UserStatus } from '../entities/user.entity';

export class CreateUserDto {
    @ApiProperty({ example: 'merchant@example.com' })
    @IsEmail()
    email: string;

    @ApiPropertyOptional({ example: 'John Smith' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ enum: UserRole, default: UserRole.ADMIN })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: ['payments:read', 'payments:write'], default: ['*'] })
    @IsOptional()
    @IsArray()
    permissions?: string[];

    @ApiPropertyOptional({ example: 'oidc', default: 'oidc' })
    @IsOptional()
    @IsString()
    authProvider?: string;

    @ApiPropertyOptional({ example: 'auth0|64fa91c8' })
    @IsOptional()
    @IsString()
    authProviderUserId?: string;

    @ApiPropertyOptional({ example: 'merchant-profile-uuid' })
    @IsOptional()
    @IsString()
    merchantId?: string;

    @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
    @IsOptional()
    @IsEnum(UserStatus)
    status?: UserStatus;
}

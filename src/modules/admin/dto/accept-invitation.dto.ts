// src/modules/admin/dto/accept-invitation.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptInvitationDto {
  @ApiProperty({
    example: 'a1b2c3d4e5f60718293a4b5c6d7e8f90...',
    description: 'Raw invitation token',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'oidc',
    description: 'Third-party auth provider name',
  })
  @IsOptional()
  @IsString()
  authProvider?: string;

  @ApiPropertyOptional({
    example: 'auth0|123456789',
    description: 'Third-party user ID (sub)',
  })
  @IsOptional()
  @IsString()
  authProviderUserId?: string;
}

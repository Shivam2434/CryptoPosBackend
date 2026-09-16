// src/modules/admin/dto/create-role.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({
    example: 'support_admin',
    description: 'Unique role identifier name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Customer and Merchant Support Administrator',
    description: 'Description of the role',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['merchants.read', 'payments.read', 'payments.refund'],
    description: 'Permissions granted by this role',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

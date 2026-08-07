// src/modules/merchants/dto/update-merchant.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateMerchantDto } from './create-merchant.dto';

export class UpdateMerchantDto extends PartialType(
    OmitType(CreateMerchantDto, ['email', 'password'] as const),
) { }
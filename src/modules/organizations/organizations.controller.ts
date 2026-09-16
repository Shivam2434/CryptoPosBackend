// src/modules/organizations/organizations.controller.ts
import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization (tenant onboarding)' })
  create(@Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(dto);
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated organization profile' })
  getCurrent(@CurrentOrg() orgId: string) {
    return this.orgsService.findById(orgId);
  }

  @Put('current')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current organization settings and profile' })
  updateCurrent(
    @CurrentOrg() orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(orgId, dto);
  }
}

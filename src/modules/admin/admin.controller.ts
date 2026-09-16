// src/modules/admin/admin.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CompositeAuthGuard } from '../../common/guards/composite-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentAuth } from '../../common/decorators/current-tenant.decorator';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';
import { PlatformPermission } from '../../common/constants/permissions.constant';
import { AdminService } from './admin.service';
import { AuditService } from '../audit/audit.service';
import { InviteAdminDto } from './dto/invite-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { AdminQueryDto } from './dto/admin-query.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { InvitationStatus } from './entities/admin-invitation.entity';

@ApiTags('Admin & Platform Governance')
@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private auditService: AuditService,
  ) {}

  // ==========================================
  // INVITATIONS
  // ==========================================

  @Post('invitations')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_INVITE)
  @ApiOperation({
    summary:
      'Invite a new platform Sub-Admin (or Super Admin if caller is Super Admin)',
  })
  inviteAdmin(@CurrentAuth() auth: AuthContext, @Body() dto: InviteAdminDto) {
    return this.adminService.inviteAdmin(dto, auth);
  }

  @Get('invitations')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_READ)
  @ApiOperation({ summary: 'List platform admin invitations' })
  @ApiQuery({ name: 'status', enum: InvitationStatus, required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  listInvitations(
    @Query('status') status?: InvitationStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listInvitations(
      status,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
  }

  @Delete('invitations/:id')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_WRITE)
  @ApiOperation({ summary: 'Revoke a pending admin invitation' })
  revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.adminService.revokeInvitation(id, auth);
  }

  @Post('invitations/accept')
  @ApiOperation({
    summary: 'Accept an admin invitation using the cryptographic invite token',
  })
  acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.adminService.acceptInvitation(dto);
  }

  // ==========================================
  // ADMIN ACCOUNTS
  // ==========================================

  @Get('admins')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_READ)
  @ApiOperation({
    summary: 'List platform administrators (paginated, filterable)',
  })
  listAdmins(@Query() query: AdminQueryDto) {
    return this.adminService.listAdmins(query);
  }

  @Get('admins/:id')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_READ)
  @ApiOperation({ summary: 'Get details of a specific platform admin' })
  getAdminById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAdminById(id);
  }

  @Patch('admins/:id')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_WRITE)
  @ApiOperation({ summary: 'Update admin permissions, role, or scopes' })
  updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminDto,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.adminService.updateAdmin(id, dto, auth);
  }

  @Post('admins/:id/deactivate')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_WRITE)
  @ApiOperation({ summary: 'Deactivate / suspend an admin account' })
  deactivateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.adminService.deactivateAdmin(id, auth);
  }

  @Post('admins/:id/activate')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_WRITE)
  @ApiOperation({ summary: 'Activate / unsuspend an admin account' })
  activateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentAuth() auth: AuthContext,
  ) {
    return this.adminService.activateAdmin(id, auth);
  }

  // ==========================================
  // ROLES & PERMISSIONS
  // ==========================================

  @Get('roles')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_READ)
  @ApiOperation({ summary: 'List all platform roles and their permissions' })
  listRoles() {
    return this.adminService.listRoles();
  }

  @Post('roles')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_WRITE)
  @ApiOperation({ summary: 'Create a custom administrative role' })
  createRole(@Body() dto: CreateRoleDto, @CurrentAuth() auth: AuthContext) {
    return this.adminService.createRole(dto, auth);
  }

  @Get('permissions')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.ADMINS_READ)
  @ApiOperation({
    summary: 'List all available platform permissions grouped by category',
  })
  listPermissions() {
    return this.adminService.listAvailablePermissions();
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  @Get('audit-logs')
  @UseGuards(CompositeAuthGuard, PermissionsGuard, ScopeGuard)
  @ApiBearerAuth()
  @RequirePermissions(PlatformPermission.AUDIT_LOGS_READ)
  @ApiOperation({ summary: 'Query platform administrative audit logs' })
  @ApiQuery({ name: 'organizationId', required: false })
  @ApiQuery({ name: 'action', required: false })
  @ApiQuery({ name: 'resourceType', required: false })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getAuditLogs(
    @Query('organizationId') organizationId?: string,
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('actorId') actorId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.queryLogs({
      organizationId,
      action,
      resourceType,
      actorId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }
}

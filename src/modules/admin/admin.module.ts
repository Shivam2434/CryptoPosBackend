// src/modules/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AdminInvitation } from './entities/admin-invitation.entity';
import { Role } from './entities/role.entity';
import { AuditModule } from '../audit/audit.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { ScopeGuard } from '../../common/guards/scope.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, AdminInvitation, Role]),
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, PermissionsGuard, ScopeGuard],
  exports: [AdminService, PermissionsGuard, ScopeGuard],
})
export class AdminModule {}

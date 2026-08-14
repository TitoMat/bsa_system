// backend/src/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditCoreModule } from '../audit/audit-core.module';
import { User } from '../users/user.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from './permissions.guard';
import { PermissionRole } from './entities/permission-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import { UserPermissionOverride } from './entities/user-permission-override.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PermissionRole,
      RolePermission,
      UserPermissionOverride,
      User,
    ]),
    AuditCoreModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}

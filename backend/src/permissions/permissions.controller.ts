// backend/src/permissions/permissions.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { type PermissionKey } from './permission.constants';
import { Permissions } from './permissions.decorator';
import { PermissionsGuard } from './permissions.guard';
import { PermissionsService } from './permissions.service';
import { UserPermissionOverrideEffect } from './entities/user-permission-override.entity';
import { ApiPermissions } from '../common/swagger/api-permissions.decorator';

type UpdateRolePermissionsDto = {
  role: string;
  permissions: PermissionKey[];
};

type CreateRoleDto = {
  name: string;
  description?: string | null;
};

type UpdateUserOverridesDto = {
  overrides: Array<{
    permission: PermissionKey;
    effect: UserPermissionOverrideEffect;
  }>;
};

@Controller('permissions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('bearer')
@ApiTags('Permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('matrix')
  @Permissions('permissions.view')
  @ApiPermissions('permissions.view')
  @ApiOperation({ summary: 'Get role permission matrix' })
  @ApiResponse({ status: 200, description: 'Permission matrix returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getMatrix() {
    return this.permissionsService.getMatrix();
  }

  @Get('roles')
  @Permissions('permissions.view')
  @ApiPermissions('permissions.view')
  @ApiOperation({ summary: 'List permission roles' })
  @ApiResponse({ status: 200, description: 'Roles returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listRoles() {
    return { roles: await this.permissionsService.listRoles() };
  }

  @Post('roles')
  @Permissions('permissions.edit')
  @ApiPermissions('permissions.edit')
  @ApiOperation({ summary: 'Create permission role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createRole(@Req() req: any, @Body() body: CreateRoleDto) {
    return this.permissionsService.createRole(body, {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    });
  }

  @Patch('roles/:role/disable')
  @Permissions('permissions.edit')
  @ApiPermissions('permissions.edit')
  @ApiOperation({ summary: 'Disable custom permission role' })
  @ApiResponse({ status: 200, description: 'Role disabled' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async disableRole(@Req() req: any, @Param('role') role: string) {
    return this.permissionsService.disableRole(role, {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    });
  }

  @Delete('roles/:role')
  @Permissions('permissions.edit')
  @ApiPermissions('permissions.edit')
  @ApiOperation({ summary: 'Delete unassigned custom permission role' })
  @ApiResponse({ status: 200, description: 'Role deleted' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteRole(@Req() req: any, @Param('role') role: string) {
    return this.permissionsService.deleteRole(role, {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    });
  }

  @Patch('matrix')
  @Permissions('permissions.edit')
  @ApiPermissions('permissions.edit')
  @ApiOperation({ summary: 'Update role permissions' })
  @ApiResponse({ status: 200, description: 'Role permissions updated' })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateMatrix(@Req() req: any, @Body() body: UpdateRolePermissionsDto) {
    return this.permissionsService.updateMatrix(body.role, body.permissions, {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role,
    });
  }

  @Get('users/:userId/overrides')
  @Permissions('permissions.view')
  @ApiPermissions('permissions.view')
  @ApiOperation({ summary: 'Get user permission overrides' })
  @ApiResponse({
    status: 200,
    description: 'User permission overrides returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUserOverrides(@Param('userId') userId: string) {
    return this.permissionsService.getUserOverrides(userId);
  }

  @Patch('users/:userId/overrides')
  @Permissions('permissions.edit')
  @ApiPermissions('permissions.edit')
  @ApiOperation({ summary: 'Update user permission overrides' })
  @ApiResponse({
    status: 200,
    description: 'User permission overrides updated',
  })
  @ApiResponse({ status: 400, description: 'Invalid request body' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateUserOverrides(
    @Req() req: any,
    @Param('userId') userId: string,
    @Body() body: UpdateUserOverridesDto,
  ) {
    return this.permissionsService.updateUserOverrides(
      userId,
      body.overrides ?? [],
      {
        id: req.user.sub,
        email: req.user.email,
        role: req.user.role,
      },
    );
  }
}

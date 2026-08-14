// backend/src/permissions/permissions.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/user.entity';
import {
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from './permission.constants';
import { PermissionRole } from './entities/permission-role.entity';
import { RolePermission } from './entities/role-permission.entity';
import {
  UserPermissionOverride,
  UserPermissionOverrideEffect,
} from './entities/user-permission-override.entity';

type PermissionUpdateActor = {
  id: string;
  email: string;
  role: string;
};

type UserOverrideInput = {
  permission: PermissionKey;
  effect: UserPermissionOverrideEffect;
};

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(PermissionRole)
    private readonly permissionRoleRepo: Repository<PermissionRole>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepo: Repository<RolePermission>,
    @InjectRepository(UserPermissionOverride)
    private readonly userPermissionOverrideRepo: Repository<UserPermissionOverride>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditService: AuditService,
  ) {}

  async ensureDefaultsSeeded(): Promise<void> {
    for (const [index, role] of Object.values(Role).entries()) {
      const existingRole = await this.permissionRoleRepo.findOne({
        where: { key: role },
      });

      if (!existingRole) {
        await this.permissionRoleRepo.save(
          this.permissionRoleRepo.create({
            key: role,
            name: role,
            description: this.getBuiltInRoleDescription(role),
            isSystem: true,
            isActive: true,
            sortOrder: index + 1,
          }),
        );
      } else if (!existingRole.isSystem || !existingRole.isActive) {
        existingRole.isSystem = true;
        existingRole.isActive = true;
        await this.permissionRoleRepo.save(existingRole);
      }

      const existingRows = await this.rolePermissionRepo.find({
        where: { role },
      });
      const existingPermissions = new Set(
        existingRows.map((row) => row.permission),
      );
      const missingPermissions = [
        ...new Set(ROLE_PERMISSIONS[role] ?? []),
      ].filter((permission) => !existingPermissions.has(permission));

      if (missingPermissions.length > 0) {
        await this.rolePermissionRepo.save(
          missingPermissions.map((permission) =>
            this.rolePermissionRepo.create({
              role,
              permission,
            }),
          ),
        );
      }
    }
  }

  async getMatrix() {
    await this.ensureDefaultsSeeded();

    const roles = await this.listRoles();
    const rows = await this.rolePermissionRepo.find({
      order: {
        role: 'ASC',
        permission: 'ASC',
      },
    });

    const rolePermissions: Record<string, string[]> = {};

    for (const role of roles) {
      rolePermissions[role.key] = [];
    }

    for (const row of rows) {
      if (!rolePermissions[row.role]) {
        rolePermissions[row.role] = [];
      }
      rolePermissions[row.role].push(row.permission);
    }

    return {
      roles: roles.map((role) => role.key),
      roleDetails: roles,
      groups: PERMISSION_GROUPS,
      rolePermissions,
    };
  }

  async listRoles() {
    await this.ensureDefaultsSeeded();

    const rows = await this.permissionRoleRepo.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });

    return rows.map((role) => ({
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isActive: role.isActive,
    }));
  }

  async createRole(
    payload: { name?: string; description?: string | null },
    actor?: PermissionUpdateActor,
  ) {
    await this.ensureDefaultsSeeded();

    const name = payload.name?.trim();
    if (!name) {
      throw new BadRequestException('Role name is required.');
    }

    const key = this.normalizeRoleKey(name);
    if (!key) {
      throw new BadRequestException(
        'Role name must contain letters or numbers.',
      );
    }

    const duplicate = await this.permissionRoleRepo
      .createQueryBuilder('role')
      .where('role.key = :key', { key })
      .orWhere('LOWER(role.name) = LOWER(:name)', { name })
      .getOne();

    if (duplicate) {
      throw new BadRequestException('Role already exists.');
    }

    const maxSort = await this.permissionRoleRepo
      .createQueryBuilder('role')
      .select('MAX(role.sortOrder)', 'max')
      .getRawOne<{ max: string | null }>();

    const saved = await this.permissionRoleRepo.save(
      this.permissionRoleRepo.create({
        key,
        name,
        description: payload.description?.trim() || null,
        isSystem: false,
        isActive: true,
        sortOrder: Number(maxSort?.max ?? 0) + 1,
      }),
    );

    if (actor) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'permission.role.create',
        targetId: saved.key,
        targetType: 'role',
        metadata: {
          roleKey: saved.key,
          roleName: saved.name,
          description: saved.description,
          actorRole: actor.role,
        },
      });
    }

    return {
      id: saved.id,
      key: saved.key,
      name: saved.name,
      description: saved.description,
      isSystem: saved.isSystem,
      isActive: saved.isActive,
    };
  }

  async disableRole(roleKey: string, actor?: PermissionUpdateActor) {
    await this.ensureDefaultsSeeded();

    const role = await this.requireMutableCustomRole(roleKey);
    const activeUsers = await this.userRepo.count({
      where: { role: role.key, isActive: true },
    });

    if (activeUsers > 0) {
      throw new ConflictException(
        'This role is assigned to active users. Reassign those users before disabling it.',
      );
    }

    role.isActive = false;
    const saved = await this.permissionRoleRepo.save(role);

    if (actor) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'permission.role.disable',
        targetId: saved.key,
        targetType: 'role',
        metadata: {
          roleKey: saved.key,
          roleName: saved.name,
          actorRole: actor.role,
        },
      });
    }

    return {
      success: true,
      role: {
        id: saved.id,
        key: saved.key,
        name: saved.name,
        description: saved.description,
        isSystem: saved.isSystem,
        isActive: saved.isActive,
      },
    };
  }

  async deleteRole(roleKey: string, actor?: PermissionUpdateActor) {
    await this.ensureDefaultsSeeded();

    const role = await this.requireMutableCustomRole(roleKey);
    const assignedUsers = await this.userRepo.count({
      where: { role: role.key },
    });

    if (assignedUsers > 0) {
      throw new ConflictException(
        'This role is assigned to users. Reassign those users before deleting it.',
      );
    }

    await this.rolePermissionRepo.delete({ role: role.key });
    await this.permissionRoleRepo.delete({ id: role.id });

    if (actor) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'permission.role.delete',
        targetId: role.key,
        targetType: 'role',
        metadata: {
          roleKey: role.key,
          roleName: role.name,
          actorRole: actor.role,
        },
      });
    }

    return { success: true, role: role.key };
  }

  async roleExists(role: string): Promise<boolean> {
    await this.ensureDefaultsSeeded();
    return this.permissionRoleRepo.exists({
      where: { key: role, isActive: true },
    });
  }

  async getPermissionsByRole(role: string): Promise<string[]> {
    await this.ensureDefaultsSeeded();

    if (role === Role.SUPERADMIN) {
      return [...new Set(ROLE_PERMISSIONS[Role.SUPERADMIN])].sort();
    }

    const rows = await this.rolePermissionRepo.find({
      where: { role },
      order: { permission: 'ASC' },
    });

    return rows.map((row) => row.permission);
  }

  async updateMatrix(
    role: string,
    permissions: PermissionKey[],
    actor?: PermissionUpdateActor,
  ) {
    await this.ensureDefaultsSeeded();

    if (!role) {
      throw new BadRequestException('Role is required.');
    }

    if (!(await this.roleExists(role))) {
      throw new NotFoundException('Role was not found.');
    }

    const validPermissions = new Set(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key),
      ),
    );
    const uniquePermissions = [...new Set(permissions)].sort();
    const invalidPermissions = uniquePermissions.filter(
      (permission) => !validPermissions.has(permission),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException('One or more permissions are invalid.');
    }

    if (role === Role.SUPERADMIN) {
      const lockedPermissions = [
        ...new Set(ROLE_PERMISSIONS[Role.SUPERADMIN]),
      ].sort();
      const sameLength = lockedPermissions.length === uniquePermissions.length;
      const sameValues = sameLength
        ? lockedPermissions.every(
            (permission, index) => permission === uniquePermissions[index],
          )
        : false;

      if (!sameValues) {
        if (actor) {
          await this.auditService.log({
            actorId: actor.id,
            actorEmail: actor.email,
            action: 'permissions.superadmin.role_update_blocked',
            targetId: role,
            targetType: 'role',
            metadata: {
              role,
              attemptedPermissions: uniquePermissions,
              actorRole: actor.role,
            },
          });
        }

        throw new ForbiddenException(
          'SUPERADMIN permissions cannot be modified.',
        );
      }

      return {
        success: true,
        role,
        permissions: lockedPermissions,
      };
    }

    const before = await this.getPermissionsByRole(role);

    await this.rolePermissionRepo.delete({ role });

    if (uniquePermissions.length > 0) {
      const rows = uniquePermissions.map((permission) =>
        this.rolePermissionRepo.create({
          role,
          permission,
        }),
      );

      await this.rolePermissionRepo.save(rows);
    }

    const after = await this.getPermissionsByRole(role);

    if (actor) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'permission.role.permissions.update',
        targetId: role,
        targetType: 'role',
        metadata: {
          role,
          before,
          after,
          added: after.filter((permission) => !before.includes(permission)),
          removed: before.filter((permission) => !after.includes(permission)),
          actorRole: actor.role,
        },
      });
    }

    return {
      success: true,
      role,
      permissions: after,
    };
  }

  async getUserOverrides(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const overrides = await this.userPermissionOverrideRepo.find({
      where: { userId },
      order: { permission: 'ASC' },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      overrides: overrides.map((item) => ({
        id: item.id,
        permission: item.permission,
        effect: item.effect,
      })),
      effectivePermissions: await this.getEffectivePermissions(
        user.id,
        user.role,
      ),
    };
  }

  async updateUserOverrides(
    userId: string,
    overrides: UserOverrideInput[],
    actor?: PermissionUpdateActor,
  ) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role === Role.SUPERADMIN) {
      if (actor) {
        await this.auditService.log({
          actorId: actor.id,
          actorEmail: actor.email,
          action: 'permissions.superadmin.user_override_blocked',
          targetId: user.id,
          targetType: 'user',
          metadata: {
            targetUserEmail: user.email,
            actorRole: actor.role,
          },
        });
      }

      throw new ForbiddenException(
        'SUPERADMIN user overrides cannot be modified.',
      );
    }

    const normalized = overrides
      .filter((item) => !!item.permission && !!item.effect)
      .map((item) => ({
        permission: item.permission,
        effect: item.effect,
      }))
      .sort((a, b) => a.permission.localeCompare(b.permission));

    const beforeRows = await this.userPermissionOverrideRepo.find({
      where: { userId },
      order: { permission: 'ASC' },
    });

    const before = beforeRows.map((item) => ({
      permission: item.permission,
      effect: item.effect,
    }));

    await this.userPermissionOverrideRepo.delete({ userId });

    if (normalized.length > 0) {
      const rows = normalized.map((item) =>
        this.userPermissionOverrideRepo.create({
          userId,
          permission: item.permission,
          effect: item.effect,
          inheritedRole: user.role,
        }),
      );

      await this.userPermissionOverrideRepo.save(rows);
    }

    const afterRows = await this.userPermissionOverrideRepo.find({
      where: { userId },
      order: { permission: 'ASC' },
    });

    const after = afterRows.map((item) => ({
      permission: item.permission,
      effect: item.effect,
    }));

    if (actor) {
      await this.auditService.log({
        actorId: actor.id,
        actorEmail: actor.email,
        action: 'permissions.user_overrides.updated',
        targetId: user.id,
        targetType: 'user',
        metadata: {
          targetUserEmail: user.email,
          targetUserRole: user.role,
          before,
          after,
          actorRole: actor.role,
        },
      });
    }

    return {
      success: true,
      userId,
      overrides: after,
      effectivePermissions: await this.getEffectivePermissions(
        user.id,
        user.role,
      ),
    };
  }

  async getEffectivePermissions(
    userId: string,
    role: string,
  ): Promise<string[]> {
    const basePermissions = await this.getPermissionsByRole(role);

    if (role === Role.SUPERADMIN) {
      return [...new Set(basePermissions)].sort();
    }

    const overrides = await this.userPermissionOverrideRepo.find({
      where: { userId },
      order: { permission: 'ASC' },
    });

    const allowed = overrides
      .filter((item) => item.effect === UserPermissionOverrideEffect.ALLOW)
      .map((item) => item.permission);

    const denied = overrides
      .filter((item) => item.effect === UserPermissionOverrideEffect.DENY)
      .map((item) => item.permission);

    const merged = new Set<string>([...basePermissions, ...allowed]);

    for (const permission of denied) {
      merged.delete(permission);
    }

    return [...merged].sort();
  }

  async hasPermissionForUser(
    userId: string,
    role: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const permissions = await this.getResolvedPermissionsForUser(userId, role);

    return requiredPermissions.every((permission) =>
      permissions.includes(permission),
    );
  }

  async getPermissionCheckContext(userId: string, tokenRole: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    const resolvedRole = user?.role ?? tokenRole;
    const permissions = await this.getEffectivePermissions(
      userId,
      resolvedRole,
    );

    return {
      userId,
      tokenRole,
      resolvedRole,
      userFound: !!user,
      userActive: user?.isActive ?? false,
      permissions,
    };
  }

  private async getResolvedPermissionsForUser(
    userId: string,
    tokenRole: string,
  ) {
    const context = await this.getPermissionCheckContext(userId, tokenRole);
    return context.permissions;
  }

  async findActiveUsersWithPermission(permission: PermissionKey) {
    await this.ensureDefaultsSeeded();

    const users = await this.userRepo.find({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    const matching: User[] = [];

    for (const user of users) {
      const permissions = await this.getEffectivePermissions(
        user.id,
        user.role,
      );

      if (permissions.includes(permission)) {
        matching.push(user);
      }
    }

    return matching;
  }

  private normalizeRoleKey(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private getBuiltInRoleDescription(role: Role) {
    if (role === Role.SUPERADMIN) return 'Protected full-access system role.';
    if (role === Role.ADMIN) return 'Default administrator role.';
    return 'Default basic user role.';
  }

  private async requireMutableCustomRole(roleKey: string) {
    const key = roleKey?.trim();
    if (!key) {
      throw new BadRequestException('Role is required.');
    }

    const role = await this.permissionRoleRepo.findOne({ where: { key } });
    if (!role || !role.isActive) {
      throw new NotFoundException('Role was not found.');
    }

    if (role.isSystem || Object.values(Role).includes(role.key as Role)) {
      throw new ForbiddenException(
        'System roles cannot be disabled or deleted.',
      );
    }

    return role;
  }
}

// backend/src/auth/permissions/permission.utils.ts
import { Role } from '../common/enums/role.enum';
import { PermissionKey, ROLE_PERMISSIONS } from './permission.constants';

export function getPermissionsByRole(role: Role | string): PermissionKey[] {
  return ROLE_PERMISSIONS[role as Role] ?? [];
}

export function hasPermission(
  userPermissions: string[] = [],
  requiredPermission?: string | string[],
): boolean {
  if (!requiredPermission) return true;

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  return userPermissions.includes(requiredPermission);
}

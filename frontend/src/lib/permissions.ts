// frontend/src/lib/permissions.ts
export function hasPermission(
  userPermissions: string[] = [],
  requiredPermission?: string | string[],
): boolean {
  if (!requiredPermission) return true;

  if (Array.isArray(requiredPermission)) {
    return requiredPermission.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  return userPermissions.includes(requiredPermission);
}

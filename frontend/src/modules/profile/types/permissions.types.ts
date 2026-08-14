// frontend/src/modules/admin-tools/types/permissions.types.ts
export type PermissionItem = {
  key: string;
  label: string;
};

export type PermissionGroup = {
  module: string;
  permissions: PermissionItem[];
};

export type PermissionRole = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
};

export type PermissionMatrixResponse = {
  roles: string[];
  roleDetails?: PermissionRole[];
  groups: PermissionGroup[];
  rolePermissions: Record<string, string[]>;
};

export type UserPermissionOverrideEffect = "allow" | "deny";

export type UserPermissionOverrideItem = {
  id: string;
  permission: string;
  effect: UserPermissionOverrideEffect;
};

export type UserPermissionOverrideUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type UserPermissionOverridesResponse = {
  user: UserPermissionOverrideUser;
  overrides: UserPermissionOverrideItem[];
  effectivePermissions: string[];
};

export type UpdateUserOverridesPayload = {
  overrides: Array<{
    permission: string;
    effect: UserPermissionOverrideEffect;
  }>;
};

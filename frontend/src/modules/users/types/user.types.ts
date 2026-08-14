// frontend/src/modules/users/types/user.types.ts
export type UserRole = string;
export type UserStatus = "ACTIVE" | "INACTIVE";

export type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  mustChangePassword?: boolean;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UserItem = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;

  isLocked?: boolean;
  isTemporarilyLocked?: boolean;

  mustChangePassword?: boolean;
  avatarUrl?: string | null;

  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
};

export type AuthMe = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  mustChangePassword?: boolean;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  password: string;
};

export type UpdateUserPayload = {
  name: string;
  email: string;
  role: UserRole;
};

export type ChangeUserStatusPayload = {
  isActive: boolean;
};

export type ResetPasswordPayload = {
  newPassword: string;
};

export function mapBackendUserToUserItem(user: BackendUser): UserItem {
  const now = Date.now();

  const isTemporarilyLocked =
    !!user.lockedUntil && new Date(user.lockedUntil).getTime() > now;

  return {
    id: user.id,
    fullName: user.name,
    email: user.email,
    role: user.role,
    status: user.isActive ? "ACTIVE" : "INACTIVE",
    failedLoginAttempts: user.failedLoginAttempts ?? 0,
    lockedUntil: user.lockedUntil ?? null,
    isLocked: isTemporarilyLocked,
    isTemporarilyLocked,
    mustChangePassword: user.mustChangePassword ?? false,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: null,
  };
}

export function mapBackendUserToAuthMe(user: BackendUser): AuthMe {
  return {
    id: user.id,
    fullName: user.name,
    email: user.email,
    role: user.role,
    status: user.isActive ? "ACTIVE" : "INACTIVE",
    mustChangePassword: user.mustChangePassword ?? false,
  };
}

// frontend/src/modules/admin-tools/services/permissions.api.ts
import { api } from "../../../api/axios";
import type {
  PermissionMatrixResponse,
  PermissionRole,
  UpdateUserOverridesPayload,
  UserPermissionOverridesResponse,
} from "../types/permissions.types";

export async function getPermissionMatrix(): Promise<PermissionMatrixResponse> {
  const response = await api.get("/permissions/matrix");
  return response.data;
}

export async function updatePermissionMatrix(payload: {
  role: string;
  permissions: string[];
}) {
  const response = await api.patch("/permissions/matrix", payload);
  return response.data;
}

export async function createPermissionRole(payload: {
  name: string;
  description?: string;
}): Promise<PermissionRole> {
  const response = await api.post("/permissions/roles", payload);
  return response.data;
}

export async function disablePermissionRole(role: string) {
  const response = await api.patch(`/permissions/roles/${role}/disable`);
  return response.data;
}

export async function deletePermissionRole(role: string) {
  const response = await api.delete(`/permissions/roles/${role}`);
  return response.data;
}

export async function getUserPermissionOverrides(
  userId: string,
): Promise<UserPermissionOverridesResponse> {
  const response = await api.get(`/permissions/users/${userId}/overrides`);
  return response.data;
}

export async function updateUserPermissionOverrides(
  userId: string,
  payload: UpdateUserOverridesPayload,
) {
  const response = await api.patch(
    `/permissions/users/${userId}/overrides`,
    payload,
  );
  return response.data;
}

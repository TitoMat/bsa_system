// frontend/src/api/users.ts
import { api } from "./axios";

export type UserRole = string;

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
};

export type UpdateUserPayload = {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
};

export async function listUsersRequest() {
  const response = await api.get<UserRecord[]>("/users");
  return response.data;
}

export async function createUserRequest(payload: CreateUserPayload) {
  const response = await api.post<UserRecord>("/users", payload);
  return response.data;
}

export async function updateUserRequest(id: string, payload: UpdateUserPayload) {
  const response = await api.patch<UserRecord>(`/users/${id}`, payload);
  return response.data;
}

export async function resetUserPasswordRequest(id: string, newPassword: string) {
  const response = await api.patch(`/users/${id}/reset-password`, { newPassword });
  return response.data;
}

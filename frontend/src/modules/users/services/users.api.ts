// frontend/src/modules/users/services/users.api.ts
import { api } from "../../../api/axios";
import type {
  AuthMe,
  BackendUser,
  ChangeUserStatusPayload,
  CreateUserPayload,
  UpdateUserPayload,
  UserItem,
  UserRole,
  UserStatus,
} from "../types/user.types";
import {
  mapBackendUserToAuthMe,
  mapBackendUserToUserItem,
} from "../types/user.types";

export type GetUsersQuery = {
  page: number;
  limit: number;
  search?: string;
  role?: "" | UserRole;
  status?: "" | UserStatus;
};

export type GetUsersResponse = {
  items: UserItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type BackendGetUsersResponse = {
  items: BackendUser[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const getUsers = async (
  query: GetUsersQuery
): Promise<GetUsersResponse> => {
  const response = await api.get("/users", {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      role: query.role || undefined,
      status: query.status || undefined,
    },
  });

  const data = response.data as BackendGetUsersResponse;

  return {
    items: (data.items ?? []).map(mapBackendUserToUserItem),
    page: data.page ?? 1,
    limit: data.limit ?? query.limit,
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
};

export const createUser = async (body: CreateUserPayload) => {
  const response = await api.post("/users", body);
  return mapBackendUserToUserItem(response.data as BackendUser);
};

export const updateUser = async (id: string, body: UpdateUserPayload) => {
  const response = await api.patch(`/users/${id}`, body);
  return mapBackendUserToUserItem(response.data as BackendUser);
};

export const changeUserStatus = async (
  id: string,
  body: ChangeUserStatusPayload,
) => {
  const response = await api.patch(`/users/${id}/status`, body);
  return mapBackendUserToUserItem(response.data as BackendUser);
};

export const resetUserPassword = async (id: string, newPassword: string) => {
  const response = await api.patch(`/users/${id}/reset-password`, {
    newPassword,
  });
  return response.data;
};

export const unlockUser = async (id: string, newPassword: string) => {
  const response = await api.patch(`/users/${id}/unlock`, {
    newPassword,
  });
  return mapBackendUserToUserItem(response.data as BackendUser);
};

export const getAuthMe = async () => {
  const response = await api.get("/auth/me");
  return mapBackendUserToAuthMe(response.data.user as BackendUser) as AuthMe;
};

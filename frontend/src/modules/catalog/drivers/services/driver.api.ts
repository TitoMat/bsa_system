import { api } from "../../../../api/axios";
import type { BackendDriver, DriverItem, CreateDriverPayload, UpdateDriverPayload } from "../types/driver.types";
import { mapBackendDriverToDriverItem } from "../types/driver.types";

export type GetDriversQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: "" | "ACTIVE" | "INACTIVE";
};

export type GetDriversResponse = {
  items: DriverItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type BackendGetDriversResponse = {
  items: BackendDriver[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const getDrivers = async (query: GetDriversQuery): Promise<GetDriversResponse> => {
  const response = await api.get("/drivers", {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      status: query.status || undefined,
    },
  });
  const data = response.data as BackendGetDriversResponse;
  return {
    items: (data.items ?? []).map(mapBackendDriverToDriverItem),
    page: data.page ?? 1,
    limit: data.limit ?? query.limit,
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
};

export const createDriver = async (body: CreateDriverPayload) => {
  const response = await api.post("/drivers", body);
  return mapBackendDriverToDriverItem(response.data as BackendDriver);
};

export const updateDriver = async (id: string, body: UpdateDriverPayload) => {
  const response = await api.patch(`/drivers/${id}`, body);
  return mapBackendDriverToDriverItem(response.data as BackendDriver);
};

export const deleteDriver = async (id: string) => {
  await api.delete(`/drivers/${id}`);
};

export const toggleDriverActive = async (id: string) => {
  const response = await api.patch(`/drivers/${id}/toggle-active`);
  return mapBackendDriverToDriverItem(response.data as BackendDriver);
};

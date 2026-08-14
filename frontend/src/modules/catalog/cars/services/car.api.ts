import { api } from '../../../../api/axios';
import type {
  BackendCar,
  CarItem,
  CreateCarPayload,
  UpdateCarPayload,
} from '../types/car.types';
import { mapBackendCarToCarItem } from '../types/car.types';

export type GetCarsQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: '' | 'ACTIVE' | 'INACTIVE';
  carType?: string;
};

export type GetCarsResponse = {
  items: CarItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type BackendGetCarsResponse = {
  items: BackendCar[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const getCars = async (query: GetCarsQuery): Promise<GetCarsResponse> => {
  const response = await api.get('/cars', {
    params: {
      page: query.page,
      limit: query.limit,
      search: query.search || undefined,
      status: query.status || undefined,
      carType: query.carType || undefined,
    },
  });

  const data = response.data as BackendGetCarsResponse;

  return {
    items: (data.items ?? []).map(mapBackendCarToCarItem),
    page: data.page ?? 1,
    limit: data.limit ?? query.limit,
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
};

export const createCar = async (body: CreateCarPayload, photo?: File) => {
  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, String(value));
  });
  if (photo) formData.append('photo', photo);
  const response = await api.post('/cars', formData);
  return mapBackendCarToCarItem(response.data as BackendCar);
};

export const updateCar = async (id: string, body: UpdateCarPayload, photo?: File) => {
  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, String(value));
  });
  if (photo) formData.append('photo', photo);
  const response = await api.patch(`/cars/${id}`, formData);
  return mapBackendCarToCarItem(response.data as BackendCar);
};

export const deleteCar = async (id: string) => {
  await api.delete(`/cars/${id}`);
};

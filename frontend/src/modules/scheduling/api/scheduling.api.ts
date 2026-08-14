import { api } from '../../../api/axios';
import type {
  AvailabilityBlockItem,
  AvailabilityCheckResult,
  BackendAvailabilityBlock,
  BackendDutySchedule,
  CreateAvailabilityBlockPayload,
  CreateDutySchedulePayload,
  DutyScheduleItem,
  GetBlockPageQuery,
  GetBlockPageResponse,
  GetSchedulePageQuery,
  GetSchedulePageResponse,
  UpdateAvailabilityBlockPayload,
  UpdateDutySchedulePayload,
} from '../types/scheduling.types';

type BackendPage<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function toScheduleItem(schedule: BackendDutySchedule): DutyScheduleItem {
  return {
    id: schedule.id,
    driverId: schedule.driverId,
    driverName: schedule.driver?.name ?? '',
    scheduleDate: schedule.scheduleDate,
    shiftStart: schedule.shiftStart,
    shiftEnd: schedule.shiftEnd,
    status: schedule.status,
    notes: schedule.notes,
  };
}

function toBlockItem(block: BackendAvailabilityBlock): AvailabilityBlockItem {
  const vehicle = block.vehicle;
  const label =
    vehicle?.name || (vehicle?.plateNumber ? `Car ${vehicle.plateNumber}` : '') || '';
  return {
    id: block.id,
    vehicleId: block.vehicleId,
    vehicleLabel: label,
    startAt: block.startAt,
    endAt: block.endAt,
    reason: block.reason,
    notes: block.notes,
  };
}

export async function getDutySchedules(
  query: GetSchedulePageQuery,
): Promise<GetSchedulePageResponse> {
  const response = await api.get<BackendPage<BackendDutySchedule>>('/driver-duty-schedules', {
    params: {
      page: query.page,
      limit: query.limit,
      driverId: query.driverId || undefined,
      from: query.from || undefined,
      to: query.to || undefined,
      status: query.status || undefined,
    },
  });
  const data = response.data;
  return {
    items: (data.items ?? []).map(toScheduleItem),
    page: data.page ?? 1,
    limit: data.limit ?? query.limit,
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
}

export async function createDutySchedule(payload: CreateDutySchedulePayload) {
  const response = await api.post<BackendDutySchedule>('/driver-duty-schedules', payload);
  return toScheduleItem(response.data);
}

export async function updateDutySchedule(id: string, payload: UpdateDutySchedulePayload) {
  const response = await api.patch<BackendDutySchedule>(`/driver-duty-schedules/${id}`, payload);
  return toScheduleItem(response.data);
}

export async function deleteDutySchedule(id: string) {
  await api.delete(`/driver-duty-schedules/${id}`);
}

export async function getAvailabilityBlocks(
  query: GetBlockPageQuery,
): Promise<GetBlockPageResponse> {
  const response = await api.get<BackendPage<BackendAvailabilityBlock>>(
    '/vehicle-availability-blocks',
    {
      params: {
        page: query.page,
        limit: query.limit,
        vehicleId: query.vehicleId || undefined,
        from: query.from || undefined,
        to: query.to || undefined,
        reason: query.reason || undefined,
      },
    },
  );
  const data = response.data;
  return {
    items: (data.items ?? []).map(toBlockItem),
    page: data.page ?? 1,
    limit: data.limit ?? query.limit,
    total: data.total ?? 0,
    totalPages: data.totalPages ?? 1,
  };
}

export async function createAvailabilityBlock(payload: CreateAvailabilityBlockPayload) {
  const response = await api.post<BackendAvailabilityBlock>('/vehicle-availability-blocks', payload);
  return toBlockItem(response.data);
}

export async function updateAvailabilityBlock(id: string, payload: UpdateAvailabilityBlockPayload) {
  const response = await api.patch<BackendAvailabilityBlock>(
    `/vehicle-availability-blocks/${id}`,
    payload,
  );
  return toBlockItem(response.data);
}

export async function deleteAvailabilityBlock(id: string) {
  await api.delete(`/vehicle-availability-blocks/${id}`);
}

export async function checkDriverAvailability(
  driverId: string,
  startAt: string,
  endAt: string,
  passengers?: number,
): Promise<AvailabilityCheckResult> {
  const response = await api.get<AvailabilityCheckResult>(`/fleet-availability/drivers/${driverId}`, {
    params: { startAt, endAt, passengers: passengers ?? undefined },
  });
  return response.data;
}

export async function checkVehicleAvailability(
  vehicleId: string,
  startAt: string,
  endAt: string,
  passengers?: number,
): Promise<AvailabilityCheckResult> {
  const response = await api.get<AvailabilityCheckResult>(`/fleet-availability/cars/${vehicleId}`, {
    params: { startAt, endAt, passengers: passengers ?? undefined },
  });
  return response.data;
}
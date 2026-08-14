export const DRIVER_DUTY_SCHEDULE_STATUSES = ['ON_DUTY', 'REST_DAY', 'LEAVE', 'UNAVAILABLE'] as const;
export type DriverDutyScheduleStatus = (typeof DRIVER_DUTY_SCHEDULE_STATUSES)[number];

export const VEHICLE_BLOCK_REASONS = [
  'MAINTENANCE',
  'REPAIR',
  'LENT_OUT',
  'EXECUTIVE_RESERVED',
  'MANUAL_BLOCK',
  'OTHER',
] as const;
export type VehicleBlockReason = (typeof VEHICLE_BLOCK_REASONS)[number];

export type BackendDutySchedule = {
  id: string;
  driverId: string;
  scheduleDate: string;
  shiftStart: string;
  shiftEnd: string;
  status: DriverDutyScheduleStatus;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  driver?: { id: string; name: string } | null;
};

export type DutyScheduleItem = {
  id: string;
  driverId: string;
  driverName: string;
  scheduleDate: string;
  shiftStart: string;
  shiftEnd: string;
  status: DriverDutyScheduleStatus;
  notes: string | null;
};

export type BackendAvailabilityBlock = {
  id: string;
  vehicleId: string;
  startAt: string;
  endAt: string;
  reason: VehicleBlockReason;
  notes: string | null;
  createdAt?: string;
  updatedAt?: string;
  vehicle?: { id: string; plateNumber?: string; name?: string } | null;
};

export type AvailabilityBlockItem = {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  startAt: string;
  endAt: string;
  reason: VehicleBlockReason;
  notes: string | null;
};

export type GetSchedulePageQuery = {
  page: number;
  limit: number;
  driverId?: string;
  from?: string;
  to?: string;
  status?: DriverDutyScheduleStatus | '';
};

export type GetSchedulePageResponse = {
  items: DutyScheduleItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type GetBlockPageQuery = {
  page: number;
  limit: number;
  vehicleId?: string;
  from?: string;
  to?: string;
  reason?: VehicleBlockReason | '';
};

export type GetBlockPageResponse = {
  items: AvailabilityBlockItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateDutySchedulePayload = {
  driverId: string;
  scheduleDate: string;
  shiftStart: string;
  shiftEnd: string;
  status: DriverDutyScheduleStatus;
  notes?: string;
};

export type UpdateDutySchedulePayload = Partial<CreateDutySchedulePayload>;

export type CreateAvailabilityBlockPayload = {
  vehicleId: string;
  startAt: string;
  endAt: string;
  reason: VehicleBlockReason;
  notes?: string;
};

export type UpdateAvailabilityBlockPayload = Partial<CreateAvailabilityBlockPayload>;

export type AvailabilityCheckResult = {
  available: boolean;
  reasons: string[];
  warnings: string[];
  evaluatedStartAt: string;
  evaluatedEndAt: string;
};
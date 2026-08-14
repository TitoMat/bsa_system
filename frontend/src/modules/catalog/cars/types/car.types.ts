export type FleetAssignmentPool = 'GENERAL' | 'EXECUTIVE' | 'SPECIAL';

export type VehicleStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';

export type CodingDay = 'NONE' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY';

export const FLEET_ASSIGNMENT_POOLS: FleetAssignmentPool[] = [
  'GENERAL',
  'EXECUTIVE',
  'SPECIAL',
];

export const VEHICLE_STATUSES: VehicleStatus[] = [
  'OPERATIONAL',
  'MAINTENANCE',
  'OUT_OF_SERVICE',
];

export const CODING_DAYS: CodingDay[] = [
  'NONE',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
];

export type BackendCar = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  plateNumber: string;
  color: string | null;
  carType: string;
  photoUrl: string | null;
  isActive: boolean;
  seatingCapacity: number;
  vehicleStatus: VehicleStatus;
  registrationExpiry: string | null;
  insuranceExpiry: string | null;
  codingDay: CodingDay;
  assignmentPool: FleetAssignmentPool;
  autoAssignEnabled: boolean;
  allowGeneralUseWhenExecutiveAway: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CarItem = {
  id: string;
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  color: string;
  carType: string;
  photoUrl: string;
  status: 'ACTIVE' | 'INACTIVE';
  seatingCapacity: number;
  vehicleStatus: VehicleStatus;
  registrationExpiry: string;
  insuranceExpiry: string;
  codingDay: CodingDay;
  assignmentPool: FleetAssignmentPool;
  autoAssignEnabled: boolean;
  allowGeneralUseWhenExecutiveAway: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCarPayload = {
  make: string;
  model: string;
  year?: number;
  plateNumber: string;
  color?: string;
  carType?: string;
  isActive?: boolean;
  seatingCapacity?: number;
  vehicleStatus?: VehicleStatus;
  registrationExpiry?: string;
  insuranceExpiry?: string;
  codingDay?: CodingDay;
  assignmentPool?: FleetAssignmentPool;
  autoAssignEnabled?: boolean;
  allowGeneralUseWhenExecutiveAway?: boolean;
};

export type UpdateCarPayload = {
  make?: string;
  model?: string;
  year?: number;
  plateNumber?: string;
  color?: string;
  carType?: string;
  isActive?: boolean;
  seatingCapacity?: number;
  vehicleStatus?: VehicleStatus;
  registrationExpiry?: string;
  insuranceExpiry?: string;
  codingDay?: CodingDay;
  assignmentPool?: FleetAssignmentPool;
  autoAssignEnabled?: boolean;
  allowGeneralUseWhenExecutiveAway?: boolean;
};

const CAR_TYPE_LABELS: Record<string, string> = {
  Sedan: 'Sedan',
  SUV: 'SUV',
  Van: 'Van',
  Truck: 'Truck',
  Hatchback: 'Hatchback',
  Coupe: 'Coupe',
  Wagon: 'Wagon',
  Other: 'Other',
};

export function getCarTypes(): { value: string; label: string }[] {
  return Object.entries(CAR_TYPE_LABELS).map(([value, label]) => ({ value, label }));
}

export function mapBackendCarToCarItem(raw: BackendCar): CarItem {
  return {
    id: raw.id,
    make: raw.make,
    model: raw.model,
    year: raw.year != null ? String(raw.year) : '',
    plateNumber: raw.plateNumber,
    color: raw.color ?? '',
    carType: CAR_TYPE_LABELS[raw.carType] ?? raw.carType,
    photoUrl: raw.photoUrl ?? '',
    status: raw.isActive ? 'ACTIVE' : 'INACTIVE',
    seatingCapacity: raw.seatingCapacity ?? 5,
    vehicleStatus: raw.vehicleStatus ?? 'OPERATIONAL',
    registrationExpiry: raw.registrationExpiry ?? '',
    insuranceExpiry: raw.insuranceExpiry ?? '',
    codingDay: raw.codingDay ?? 'NONE',
    assignmentPool: raw.assignmentPool ?? 'GENERAL',
    autoAssignEnabled: raw.autoAssignEnabled ?? true,
    allowGeneralUseWhenExecutiveAway: raw.allowGeneralUseWhenExecutiveAway ?? false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export type FleetAssignmentPool = 'GENERAL' | 'EXECUTIVE' | 'SPECIAL';

export type DriverDutyStatus = 'ON_DUTY' | 'OFF_DUTY' | 'ON_LEAVE' | 'ON_BREAK' | 'SUSPENDED';

export const FLEET_ASSIGNMENT_POOLS: FleetAssignmentPool[] = [
  'GENERAL',
  'EXECUTIVE',
  'SPECIAL',
];

export const DRIVER_DUTY_STATUSES: DriverDutyStatus[] = [
  'ON_DUTY',
  'OFF_DUTY',
  'ON_LEAVE',
  'ON_BREAK',
  'SUSPENDED',
];

export type BackendDriver = {
  id: string;
  name: string;
  licenseNumber: string;
  contactNumber: string | null;
  address: string | null;
  isActive: boolean;
  dutyStatus: DriverDutyStatus;
  licenseExpiry: string | null;
  assignmentPool: FleetAssignmentPool;
  autoAssignEnabled: boolean;
  allowGeneralUseWhenExecutiveAway: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type DriverItem = {
  id: string;
  name: string;
  licenseNumber: string;
  contactNumber: string;
  address: string;
  status: 'ACTIVE' | 'INACTIVE';
  dutyStatus: DriverDutyStatus;
  licenseExpiry: string;
  assignmentPool: FleetAssignmentPool;
  autoAssignEnabled: boolean;
  allowGeneralUseWhenExecutiveAway: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateDriverPayload = {
  name: string;
  licenseNumber: string;
  contactNumber?: string;
  address?: string;
  isActive?: boolean;
  licenseExpiry?: string;
  assignmentPool?: FleetAssignmentPool;
  autoAssignEnabled?: boolean;
  allowGeneralUseWhenExecutiveAway?: boolean;
};

export type UpdateDriverPayload = {
  name?: string;
  licenseNumber?: string;
  contactNumber?: string;
  address?: string;
  isActive?: boolean;
  dutyStatus?: DriverDutyStatus;
  licenseExpiry?: string;
  assignmentPool?: FleetAssignmentPool;
  autoAssignEnabled?: boolean;
  allowGeneralUseWhenExecutiveAway?: boolean;
};

export function mapBackendDriverToDriverItem(raw: BackendDriver): DriverItem {
  return {
    id: raw.id,
    name: raw.name,
    licenseNumber: raw.licenseNumber,
    contactNumber: raw.contactNumber ?? '',
    address: raw.address ?? '',
    status: raw.isActive ? 'ACTIVE' : 'INACTIVE',
    dutyStatus: raw.dutyStatus ?? 'OFF_DUTY',
    licenseExpiry: raw.licenseExpiry ?? '',
    assignmentPool: raw.assignmentPool ?? 'GENERAL',
    autoAssignEnabled: raw.autoAssignEnabled ?? true,
    allowGeneralUseWhenExecutiveAway: raw.allowGeneralUseWhenExecutiveAway ?? false,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

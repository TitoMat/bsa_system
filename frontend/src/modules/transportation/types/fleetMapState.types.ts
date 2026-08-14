import type { LatLng } from '../../maps/types/maps.types';

/**
 * R6 — Fleet map state. Wire DTO mirrors the backend response verbatim
 * (backend canonical statuses; no presentation synonyms here). Presentation
 * derivations (ASSIGNED/ON_TRIP/…) happen in the map feature mapper — at the
 * UI boundary only.
 */

export type VehicleLocationStatus = 'AVAILABLE' | 'UNAVAILABLE';
export type VehicleLocationSource = 'DRIVER_LOCATION';

export interface FleetMapVehicleLocationDto {
  latitude: number;
  longitude: number;
}

export interface FleetMapAssignmentDto {
  id: string;
  requestId: string;
  requestNumber: string | null;
  driverId: string;
  driverName: string | null;
  requestStatus: string;
  scheduledPickupAt: string | null;
}

export interface FleetMapVehicleDto {
  id: string;
  plateNumber: string | null;
  make: string | null;
  model: string | null;
  vehicleStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  location: FleetMapVehicleLocationDto | null;
  locationStatus: VehicleLocationStatus;
  locationSource: VehicleLocationSource | null;
  locationUpdatedAt: string | null;
  assignment: FleetMapAssignmentDto | null;
}

export interface FleetMapStateSummaryDto {
  totalVehicles: number;
  mappedVehicles: number;
  unlocatedVehicles: number;
}

export interface FleetMapStateResponse {
  vehicles: FleetMapVehicleDto[];
  summary: FleetMapStateSummaryDto;
  generatedAt: string;
}

/**
 * Presentation-boundary vehicle map feature. coordinate is in map-native
 * [longitude, latitude] order — the same order the map engines expect for
 * marker placement.
 */
export type VehicleMapStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'ON_TRIP'
  | 'MAINTENANCE'
  | 'OFFLINE';

export interface VehicleMapFeature {
  id: string;
  label: string;
  plateNumber: string | null;
  vehicleStatus: 'OPERATIONAL' | 'MAINTENANCE' | 'OUT_OF_SERVICE';
  status: VehicleMapStatus;
  position: LatLng;
  coordinate: [number, number];
  locationSource: VehicleLocationSource | null;
  driverId: string | null;
  driverName: string | null;
  requestId: string | null;
  requestNumber: string | null;
  requestStatus: string | null;
}
import type {
  FleetMapStateResponse,
  VehicleMapFeature,
  VehicleMapStatus,
} from '../types/fleetMapState.types';

/** Strict WGS84 validation — rejects non-finite and out-of-range values. */
export function isValidCoordinate(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): latitude is number {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return false;
  }
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

const TRANSIT_STATUSES = new Set([
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PASSENGER_ONBOARD',
  'IN_TRANSIT',
  'DELAYED',
  'ARRIVED_AT_DESTINATION',
  'RETURNING',
]);

/**
 * Presentation-boundary derivation of the vehicle state. The backend is the
 * canonical source of truth; this ONLY maps canonical vehicle status +
 * assignment state to a UI state at the boundary. No synonyms leak into or
 * out of persistence.
 */
export function deriveVehicleMapStatus(
  vehicleStatus: VehicleMapFeature['vehicleStatus'],
  requestStatus: string | null,
  hasActiveAssignment: boolean,
): VehicleMapStatus {
  if (vehicleStatus === 'MAINTENANCE') return 'MAINTENANCE';
  if (vehicleStatus === 'OUT_OF_SERVICE') return 'OFFLINE';
  if (hasActiveAssignment && requestStatus && TRANSIT_STATUSES.has(requestStatus)) {
    return 'ON_TRIP';
  }
  if (hasActiveAssignment) return 'ASSIGNED';
  return 'AVAILABLE';
}

export function vehicleLabel(vehicle: {
  make: string | null;
  model: string | null;
  plateNumber: string | null;
}): string {
  const name = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return vehicle.plateNumber ?? (name || 'Vehicle');
}

/**
 * Maps the wire DTO to marker features. Only vehicles with a legitimate
 * available location become features (backend deliberately emits no synthetic
 * coordinates); malformed positions are dropped defensively.
 */
export function toVehicleMapFeatures(
  state: FleetMapStateResponse | undefined,
): VehicleMapFeature[] {
  if (!state) return [];
  const features: VehicleMapFeature[] = [];

  for (const vehicle of state.vehicles) {
    if (
      vehicle.locationStatus !== 'AVAILABLE' ||
      !vehicle.location ||
      !isValidCoordinate(vehicle.location.latitude, vehicle.location.longitude)
    ) {
      continue;
    }
    const assignment = vehicle.assignment;
    features.push({
      id: vehicle.id,
      label: vehicleLabel(vehicle),
      plateNumber: vehicle.plateNumber,
      vehicleStatus: vehicle.vehicleStatus,
      status: deriveVehicleMapStatus(
        vehicle.vehicleStatus,
        assignment?.requestStatus ?? null,
        Boolean(assignment),
      ),
      position: {
        latitude: vehicle.location.latitude,
        longitude: vehicle.location.longitude,
      },
      coordinate: [vehicle.location.longitude, vehicle.location.latitude],
      locationSource: vehicle.locationSource,
      driverId: assignment?.driverId ?? null,
      driverName: assignment?.driverName ?? null,
      requestId: assignment?.requestId ?? null,
      requestNumber: assignment?.requestNumber ?? null,
      requestStatus: assignment?.requestStatus ?? null,
    });
  }

  return features;
}
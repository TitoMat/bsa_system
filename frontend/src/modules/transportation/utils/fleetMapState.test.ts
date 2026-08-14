import { describe, expect, it } from 'vitest';
import type { FleetMapStateResponse } from '../types/fleetMapState.types';
import {
  deriveVehicleMapStatus,
  isValidCoordinate,
  toVehicleMapFeatures,
  vehicleLabel,
} from './fleetMapState';

const vehicle = (overrides: Partial<FleetMapStateResponse['vehicles'][number]> = {}) => ({
  id: 'car-1',
  plateNumber: 'NIN123',
  make: 'Toyota',
  model: 'Hiace',
  vehicleStatus: 'OPERATIONAL' as const,
  location: { latitude: 14.601, longitude: 121.011 },
  locationStatus: 'AVAILABLE' as const,
  locationSource: 'DRIVER_LOCATION' as const,
  locationUpdatedAt: null,
  assignment: {
    id: 'fa-1',
    requestId: 'req-1',
    requestNumber: 'TR-2026-0001',
    driverId: 'drv-1',
    driverName: 'Juan Dela Cruz',
    requestStatus: 'IN_TRANSIT',
    scheduledPickupAt: '2026-08-13T01:00:00.000Z',
  },
  ...overrides,
});

describe('isValidCoordinate', () => {
  it('accepts valid WGS84 values', () => {
    expect(isValidCoordinate(14.601, 121.011)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(0, 0)).toBe(true);
  });

  it('rejects null/undefined and out-of-range or non-finite values', () => {
    expect(isValidCoordinate(null, 121)).toBe(false);
    expect(isValidCoordinate(14, undefined)).toBe(false);
    expect(isValidCoordinate(91, 121)).toBe(false);
    expect(isValidCoordinate(14, -181)).toBe(false);
    expect(isValidCoordinate(Number.NaN, 121)).toBe(false);
    expect(isValidCoordinate(Infinity, 121)).toBe(false);
  });
});

describe('vehicleLabel', () => {
  it('prefers the plate, falling back to the make/model name', () => {
    expect(vehicleLabel({ make: 'Toyota', model: 'Hiace', plateNumber: 'NIN123' })).toBe('NIN123');
    expect(vehicleLabel({ make: 'Toyota', model: 'Hiace', plateNumber: null })).toBe('Toyota Hiace');
    expect(vehicleLabel({ make: null, model: null, plateNumber: null })).toBe('Vehicle');
  });
});

describe('deriveVehicleMapStatus', () => {
  it('surfaces maintenance/out-of-service before assignment state', () => {
    expect(deriveVehicleMapStatus('MAINTENANCE', 'IN_TRANSIT', true)).toBe('MAINTENANCE');
    expect(deriveVehicleMapStatus('OUT_OF_SERVICE', null, false)).toBe('OFFLINE');
  });

  it('derives ON_TRIP only for in-transit canonical phases', () => {
    expect(deriveVehicleMapStatus('OPERATIONAL', 'IN_TRANSIT', true)).toBe('ON_TRIP');
    expect(deriveVehicleMapStatus('OPERATIONAL', 'EN_ROUTE_TO_PICKUP', true)).toBe('ON_TRIP');
    expect(deriveVehicleMapStatus('OPERATIONAL', 'ARRIVED_AT_DESTINATION', true)).toBe('ON_TRIP');
    expect(deriveVehicleMapStatus('OPERATIONAL', 'DRIVER_ASSIGNED', true)).toBe('ASSIGNED');
  });

  it('treats an active assignment without transit as ASSIGNED, and free as AVAILABLE', () => {
    expect(deriveVehicleMapStatus('OPERATIONAL', null, true)).toBe('ASSIGNED');
    expect(deriveVehicleMapStatus('OPERATIONAL', null, false)).toBe('AVAILABLE');
  });
});

describe('toVehicleMapFeatures', () => {
  it('maps an available vehicle to a feature with map-native [lng, lat] coordinates', () => {
    const state: FleetMapStateResponse = {
      vehicles: [vehicle()],
      summary: { totalVehicles: 1, mappedVehicles: 1, unlocatedVehicles: 0 },
      generatedAt: '2026-08-13T00:00:00.000Z',
    };
    const features = toVehicleMapFeatures(state);
    expect(features).toHaveLength(1);
    const [feature] = features;
    expect(feature.id).toBe('car-1');
    expect(feature.coordinate).toEqual([121.011, 14.601]);
    expect(feature.status).toBe('ON_TRIP');
    expect(feature.driverName).toBe('Juan Dela Cruz');
    expect(feature.requestId).toBe('req-1');
  });

  it('drops unavailable, location-less and invalid-position vehicles (no synthetic coords)', () => {
    const state: FleetMapStateResponse = {
      vehicles: [
        vehicle({ id: 'a', location: null, locationStatus: 'UNAVAILABLE' }),
        vehicle({ id: 'b', location: { latitude: 999, longitude: 121 }, locationStatus: 'AVAILABLE' }),
        vehicle({ id: 'c', location: { latitude: NaN, longitude: 121 }, locationStatus: 'AVAILABLE' }),
        vehicle({ id: 'd', locationStatus: 'UNAVAILABLE' }),
      ],
      summary: { totalVehicles: 4, mappedVehicles: 0, unlocatedVehicles: 4 },
      generatedAt: '2026-08-13T00:00:00.000Z',
    };
    expect(toVehicleMapFeatures(state)).toHaveLength(0);
  });

  it('returns an empty list for missing data (guards undefined state)', () => {
    expect(toVehicleMapFeatures(undefined)).toEqual([]);
  });

  it('preserves maintenance tagging at the boundary', () => {
    const state: FleetMapStateResponse = {
      vehicles: [
        vehicle({ id: 'm', vehicleStatus: 'MAINTENANCE', assignment: null }),
      ],
      summary: { totalVehicles: 1, mappedVehicles: 1, unlocatedVehicles: 0 },
      generatedAt: '2026-08-13T00:00:00.000Z',
    };
    expect(toVehicleMapFeatures(state)[0].status).toBe('MAINTENANCE');
  });
});
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Car } from '../../catalog/cars/car.entity';
import {
  FleetMapStateService,
  FleetMapStateRow,
} from './fleet-map-state.service';

const row = (overrides: Partial<FleetMapStateRow> = {}): FleetMapStateRow => ({
  v_id: 'car-1',
  v_plate: 'NIN123',
  v_make: 'Toyota',
  v_model: 'Hiace',
  v_status: 'OPERATIONAL',
  fa_id: 'fa-1',
  fa_request_id: 'req-1',
  fa_driver_id: 'drv-1',
  r_number: 'TR-2026-0001',
  r_status: 'IN_TRANSIT',
  r_pickup_at: new Date('2026-08-13T01:00:00Z'),
  d_name: 'Juan Dela Cruz',
  d_lat: '14.601',
  d_lng: '121.011',
  ...overrides,
});

type MockQueryBuilder = {
  leftJoin: jest.Mock;
  where: jest.Mock;
  select: jest.Mock;
  orderBy: jest.Mock;
  getRawMany: jest.Mock;
};

const makeQueryBuilder = (rows: FleetMapStateRow[]): MockQueryBuilder => {
  const qb: MockQueryBuilder = {
    leftJoin: jest.fn(() => qb),
    where: jest.fn(() => qb),
    select: jest.fn(() => qb),
    orderBy: jest.fn(() => qb),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
  return qb;
};

describe('FleetMapStateService', () => {
  let service: FleetMapStateService;
  let carRepo: { createQueryBuilder: jest.Mock };

  const build = async (rows: FleetMapStateRow[]) => {
    carRepo = {
      createQueryBuilder: jest.fn(() => makeQueryBuilder(rows)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetMapStateService,
        { provide: getRepositoryToken(Car), useValue: carRepo },
      ],
    }).compile();
    service = module.get<FleetMapStateService>(FleetMapStateService);
    return service.getMapState();
  };

  it('is JOIN-based and N+1 free (single getRawMany call)', async () => {
    carRepo = {
      createQueryBuilder: jest.fn(() => makeQueryBuilder([row()])),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetMapStateService,
        { provide: getRepositoryToken(Car), useValue: carRepo },
      ],
    }).compile();
    service = module.get<FleetMapStateService>(FleetMapStateService);

    await service.getMapState();

    expect(carRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    const qb = carRepo.createQueryBuilder.mock.results[0]
      .value as MockQueryBuilder;
    expect(qb.getRawMany).toHaveBeenCalledTimes(1);
    expect(qb.getRawMany.mock.instances[0] === qb).toBe(true);
  });

  it('filters out inactive vehicles via where clause', async () => {
    carRepo = {
      createQueryBuilder: jest.fn(() => makeQueryBuilder([row()])),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetMapStateService,
        { provide: getRepositoryToken(Car), useValue: carRepo },
      ],
    }).compile();
    service = module.get<FleetMapStateService>(FleetMapStateService);

    await service.getMapState();

    const qb = carRepo.createQueryBuilder.mock.results[0]
      .value as MockQueryBuilder;
    expect(qb.where).toHaveBeenCalledWith('v.is_active = true');
  });

  it('emits a vehicle location only from the assigned driver persisted coords (ACTIVE assignment)', async () => {
    const state = await build([row()]);
    expect(state.vehicles).toHaveLength(1);
    const v = state.vehicles[0];
    expect(v.location).toEqual({ latitude: 14.601, longitude: 121.011 });
    expect(v.locationStatus).toBe('AVAILABLE');
    expect(v.locationSource).toBe('DRIVER_LOCATION');
    expect(v.locationUpdatedAt).toBeNull();
    expect(v.assignment).toEqual({
      id: 'fa-1',
      requestId: 'req-1',
      requestNumber: 'TR-2026-0001',
      driverId: 'drv-1',
      driverName: 'Juan Dela Cruz',
      requestStatus: 'IN_TRANSIT',
      scheduledPickupAt: '2026-08-13T01:00:00.000Z',
    });
    expect(state.summary).toEqual({
      totalVehicles: 1,
      mappedVehicles: 1,
      unlocatedVehicles: 0,
    });
  });

  it('does NOT emit a location when the vehicle has no ACTIVE assignment', async () => {
    const state = await build([row({ fa_id: null, d_lat: null, d_lng: null })]);
    expect(state.vehicles[0].location).toBeNull();
    expect(state.vehicles[0].locationStatus).toBe('UNAVAILABLE');
    expect(state.vehicles[0].locationSource).toBeNull();
    expect(state.vehicles[0].assignment).toBeNull();
    expect(state.summary.unlocatedVehicles).toBe(1);
  });

  it('does NOT emit a location when driver coords are missing or invalid', async () => {
    const noCoords = await build([row({ d_lat: null, d_lng: null })]);
    expect(noCoords.vehicles[0].locationStatus).toBe('UNAVAILABLE');

    const outOfRange = await build([row({ d_lat: '999', d_lng: '-200' })]);
    expect(outOfRange.vehicles[0].locationStatus).toBe('UNAVAILABLE');

    const nonNumeric = await build([row({ d_lat: 'abc', d_lng: '1.5' })]);
    expect(nonNumeric.vehicles[0].locationStatus).toBe('UNAVAILABLE');
  });

  it('tags maintenance status as-is (canonical, no synonym normalization)', async () => {
    const state = await build([row({ v_status: 'MAINTENANCE' })]);
    expect(state.vehicles[0].vehicleStatus).toBe('MAINTENANCE');
  });

  it('aggregates summary across multiple vehicles', async () => {
    const state = await build([
      row({ v_id: 'car-1', v_plate: 'A1' }),
      row({
        v_id: 'car-2',
        v_plate: 'A2',
        fa_id: null,
        d_lat: null,
        d_lng: null,
      }),
      row({ v_id: 'car-3', v_plate: 'MAINT', v_status: 'MAINTENANCE' }),
    ]);
    expect(state.summary).toEqual({
      totalVehicles: 3,
      mappedVehicles: 2,
      unlocatedVehicles: 1,
    });
  });

  it('exposes an ISO generatedAt timestamp', async () => {
    const state = await build([row()]);
    expect(new Date(state.generatedAt).toISOString()).toBe(state.generatedAt);
  });
});

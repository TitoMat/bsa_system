import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { TransportationRequest } from '../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../transportation/entities/transport-assignment.entity';
import { FleetAvailabilityService } from '../scheduling/services/fleet-availability.service';
import { FleetAssignment } from '../dispatch/entities/fleet-assignment.entity';
import { FleetAssignmentDiagnosticsService } from './fleet-assignment-diagnostics.service';
import type {
  AvailabilityResult,
  DriverAvailabilityReason,
  VehicleAvailabilityReason,
} from '../scheduling/domain/scheduling-domain';

// Window: 09:00–12:00 PH on 2026-08-12.
const START = new Date('2026-08-12T01:00:00.000Z');
const END = new Date('2026-08-12T04:00:00.000Z');

const driverAvailability = (
  available: boolean,
  reasons: DriverAvailabilityReason[] = [],
): AvailabilityResult<DriverAvailabilityReason> => ({
  available,
  reasons,
  warnings: [],
  evaluatedStartAt: START.toISOString(),
  evaluatedEndAt: END.toISOString(),
});

const vehicleAvailability = (
  available: boolean,
  reasons: VehicleAvailabilityReason[] = [],
): AvailabilityResult<VehicleAvailabilityReason> => ({
  available,
  reasons,
  warnings: [],
  evaluatedStartAt: START.toISOString(),
  evaluatedEndAt: END.toISOString(),
});

const makeRequest = (overrides: Partial<TransportationRequest> = {}) =>
  ({
    id: 'req-1',
    requestNumber: 'TR-2026-0001',
    tripType: 'ONE_WAY',
    status: 'PENDING',
    passengerCount: 5,
    scheduledPickupAt: START,
    expectedEndAt: END,
    expectedReturnAt: null,
    estimatedDistanceMeters: 14800,
    estimatedDurationSeconds: 1860,
    routeProvider: 'OSRM',
    routeCalculatedAt: new Date('2026-08-12T00:30:00.000Z'),
    routeGeometry: null,
    ...overrides,
  }) as TransportationRequest;

const makeDriver = (overrides: Partial<Driver> = {}) =>
  ({
    id: 'd-1',
    name: 'Driver 1',
    isActive: true,
    autoAssignEnabled: true,
    dutyStatus: 'OFF_DUTY',
    licenseExpiry: null,
    currentLatitude: 14.601,
    currentLongitude: 121.011,
    ...overrides,
  }) as Driver;

const makeCar = (overrides: Partial<Car> = {}) =>
  ({
    id: 'car-1',
    make: 'Toyota',
    model: 'Camry',
    plateNumber: 'ABC-1234',
    isActive: true,
    autoAssignEnabled: true,
    vehicleStatus: 'OPERATIONAL',
    seatingCapacity: 5,
    registrationExpiry: null,
    insuranceExpiry: null,
    codingDay: 'NONE',
    ...overrides,
  }) as Car;

const makeConflictRow = (overrides: Record<string, unknown> = {}) => ({
  assignmentId: 'asg-1',
  driverId: 'd-1',
  vehicleId: 'car-1',
  assignmentStatus: 'OFFERED',
  requestId: 'req-9',
  requestNumber: 'TR-2026-0009',
  requestStatus: 'PENDING',
  tripType: 'ONE_WAY',
  scheduledPickupAt: new Date('2026-08-12T01:30:00.000Z'),
  expectedEndAt: new Date('2026-08-12T05:00:00.000Z'),
  expectedReturnAt: null,
  ...overrides,
});

describe('FleetAssignmentDiagnosticsService', () => {
  let service: FleetAssignmentDiagnosticsService;
  let requestRepo: { findOne: jest.Mock };
  let assignmentRepo: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let fleetAssignmentRepo: {
    findOne: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let driverRepo: { find: jest.Mock };
  let carRepo: { find: jest.Mock };
  let availabilityService: {
    checkDrivers: jest.Mock;
    checkVehicles: jest.Mock;
    getCoveringOnDutyShifts: jest.Mock;
  };

  const chainable = () => {
    const qb: Record<string, jest.Mock> = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      setParameter: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    return qb;
  };

  const expectNoCandidates = (
    result: Awaited<ReturnType<typeof service.getDiagnostics>>,
  ) => {
    expect(result.drivers.eligible).toEqual([]);
    expect(result.drivers.excluded).toEqual([]);
    expect(result.vehicles.eligible).toEqual([]);
    expect(result.vehicles.excluded).toEqual([]);
  };

  beforeEach(async () => {
    requestRepo = { findOne: jest.fn() };
    assignmentRepo = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
    fleetAssignmentRepo = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(chainable()),
    };
    driverRepo = { find: jest.fn() };
    carRepo = { find: jest.fn() };
    availabilityService = {
      checkDrivers: jest.fn(),
      checkVehicles: jest.fn(),
      getCoveringOnDutyShifts: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetAssignmentDiagnosticsService,
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        {
          provide: getRepositoryToken(TransportAssignment),
          useValue: assignmentRepo,
        },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(Car), useValue: carRepo },
        {
          provide: getRepositoryToken(FleetAssignment),
          useValue: fleetAssignmentRepo,
        },
        { provide: FleetAvailabilityService, useValue: availabilityService },
      ],
    }).compile();

    service = module.get<FleetAssignmentDiagnosticsService>(
      FleetAssignmentDiagnosticsService,
    );
  });

  it('throws NotFoundException for an unknown request', async () => {
    requestRepo.findOne.mockResolvedValue(null);

    await expect(service.getDiagnostics('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns a complete result with eligible candidates and route summary', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.findOne.mockResolvedValue({
      driverId: 'd-1',
      vehicleId: 'car-1',
      status: 'ACCEPTED',
    });
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.request).toMatchObject({
      id: 'req-1',
      serviceWindowComplete: true,
      passengerCount: 5,
      currentAssignment: {
        driverId: 'd-1',
        vehicleId: 'car-1',
        status: 'ACCEPTED',
      },
    });
    expect(result.route).toEqual({
      status: 'AVAILABLE',
      distanceMeters: 14800,
      durationSeconds: 1860,
      provider: 'OSRM',
      calculatedAt: '2026-08-12T00:30:00.000Z',
    });
    expect(result.drivers.eligible).toHaveLength(1);
    expect(result.drivers.eligible[0]).toMatchObject({
      driverId: 'd-1',
      eligible: true,
      hasLiveLocation: true,
      score: 75,
      scoreComponents: { workload: 75, scheduleFit: 0 },
      currentWorkload: 0,
      exclusionReasons: [],
      conflict: null,
    });
    expect(result.drivers.excluded).toEqual([]);
    expect(result.vehicles.eligible).toHaveLength(1);
    expect(result.vehicles.eligible[0].score).toBe(100);
    expect(result.vehicles.eligible[0].scoreComponents).toEqual({
      capacityFit: 60,
      workload: 40,
    });
  });

  it('includes schedule-fit points from covering shift buffer', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    // Shift 08:00–14:00 PH: 1h before + 2h after the 09:00–12:00 window.
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(
      new Map([
        [
          'd-1',
          [
            {
              startAt: new Date('2026-08-12T00:00:00.000Z'),
              endAt: new Date('2026-08-12T06:00:00.000Z'),
            },
          ],
        ],
      ]),
    );
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible[0].scoreComponents).toEqual({
      workload: 75,
      scheduleFit: 8,
    });
    expect(result.drivers.eligible[0].score).toBe(83);
  });

  it('ranks lower workload drivers first (deterministic)', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([
      makeDriver({ id: 'd-1', name: 'Alpha' }),
      makeDriver({ id: 'd-2', name: 'Beta' }),
    ]);
    carRepo.find.mockResolvedValue([]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([
        ['d-1', driverAvailability(true)],
        ['d-2', driverAvailability(true)],
      ]),
    );
    availabilityService.checkVehicles.mockResolvedValue(new Map());
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());

    const qb = chainable();
    assignmentRepo.createQueryBuilder.mockReturnValue(qb);
    // First raw call = conflicts (empty), then driver workload rows.
    qb.getRawMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      { driverId: 'd-1', count: '3' },
      { driverId: 'd-2', count: '1' },
    ]);

    const result = await service.getDiagnostics('req-1');

    const names = result.drivers.eligible.map((d) => d.driverName);
    expect(names).toEqual(['Beta', 'Alpha']);
    // 75*(1-1/8) rounded = 66; 75*(1-3/8) rounded = 47.
    expect(result.drivers.eligible[0].scoreComponents?.workload).toBe(66);
    expect(result.drivers.eligible[1].scoreComponents?.workload).toBe(47);
  });

  it('breaks score ties by name, then by id', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([
      makeDriver({ id: 'd-2', name: 'Zulu' }),
      makeDriver({ id: 'd-1', name: 'Zulu' }),
      makeDriver({ id: 'd-3', name: 'Alpha' }),
    ]);
    carRepo.find.mockResolvedValue([]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([
        ['d-1', driverAvailability(true)],
        ['d-2', driverAvailability(true)],
        ['d-3', driverAvailability(true)],
      ]),
    );
    availabilityService.checkVehicles.mockResolvedValue(new Map());
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible.map((d) => d.driverId)).toEqual([
      'd-3',
      'd-1',
      'd-2',
    ]);
  });

  it('ranks a fitting vehicle above an oversized one', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([]);
    carRepo.find.mockResolvedValue([
      makeCar({
        id: 'car-8',
        make: 'Toyota',
        model: 'Hiace',
        seatingCapacity: 8,
      }),
      makeCar({
        id: 'car-5',
        make: 'Toyota',
        model: 'Camry',
        seatingCapacity: 5,
      }),
    ]);
    availabilityService.checkDrivers.mockResolvedValue(new Map());
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([
        ['car-8', vehicleAvailability(true)],
        ['car-5', vehicleAvailability(true)],
      ]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    // car-5: excess 0 → 60; car-8: excess 3 → max(20, 60-18) = 42.
    expect(result.vehicles.eligible.map((v) => v.vehicleId)).toEqual([
      'car-5',
      'car-8',
    ]);
    expect(result.vehicles.eligible[1].scoreComponents?.capacityFit).toBe(42);
  });

  it('excludes a driver with an overlapping existing request', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());

    const qb = chainable();
    assignmentRepo.createQueryBuilder.mockReturnValue(qb);
    qb.getRawMany.mockResolvedValue([
      makeConflictRow({
        requestId: 'req-9',
        requestNumber: 'TR-2026-0009',
        scheduledPickupAt: new Date('2026-08-12T01:30:00.000Z'),
        expectedEndAt: new Date('2026-08-12T05:00:00.000Z'),
      }),
    ]);

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible).toEqual([]);
    expect(result.drivers.excluded).toHaveLength(1);
    expect(result.drivers.excluded[0].exclusionReasons).toEqual([
      'EXISTING_REQUEST_CONFLICT',
    ]);
    expect(result.drivers.excluded[0].score).toBeNull();
    expect(result.drivers.excluded[0].conflict).toEqual({
      requestId: 'req-9',
      requestNumber: 'TR-2026-0009',
      startAt: '2026-08-12T01:30:00.000Z',
      endAt: '2026-08-12T05:00:00.000Z',
      source: 'LEGACY',
    });
  });

  it('ignores an existing request that does not overlap the window', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());

    const qb = chainable();
    assignmentRepo.createQueryBuilder.mockReturnValue(qb);
    qb.getRawMany.mockResolvedValue([
      // 13:30–18:00 PH — after the 09:00–12:00 window.
      makeConflictRow({
        scheduledPickupAt: new Date('2026-08-12T05:30:00.000Z'),
        expectedEndAt: new Date('2026-08-12T10:00:00.000Z'),
      }),
    ]);

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible).toHaveLength(1);
    expect(result.drivers.eligible[0].exclusionReasons).toEqual([]);
    expect(result.drivers.eligible[0].conflict).toBeNull();
  });

  it('ignores assignments for terminal requests', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());

    const qb = chainable();
    assignmentRepo.createQueryBuilder.mockReturnValue(qb);
    qb.getRawMany.mockResolvedValue([
      makeConflictRow({ requestStatus: 'COMPLETED' }),
    ]);

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible).toHaveLength(1);
  });

  it('combines availability reasons with conflict exclusion for vehicles', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([]);
    carRepo.find.mockResolvedValue([makeCar({ seatingCapacity: 4 })]);
    availabilityService.checkDrivers.mockResolvedValue(new Map());
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([
        ['car-1', vehicleAvailability(false, ['CAPACITY_INSUFFICIENT'])],
      ]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());

    const qb = chainable();
    assignmentRepo.createQueryBuilder.mockReturnValue(qb);
    qb.getRawMany.mockResolvedValue([makeConflictRow()]);

    const result = await service.getDiagnostics('req-1');

    expect(result.vehicles.eligible).toEqual([]);
    expect(result.vehicles.excluded[0].exclusionReasons).toEqual([
      'CAPACITY_INSUFFICIENT',
      'EXISTING_REQUEST_CONFLICT',
    ]);
    expect(result.vehicles.excluded[0].score).toBeNull();
  });

  it('returns UNAVAILABLE route summary and still evaluates candidates', async () => {
    requestRepo.findOne.mockResolvedValue(
      makeRequest({
        estimatedDistanceMeters: null,
        estimatedDurationSeconds: null,
        routeProvider: null,
        routeCalculatedAt: null,
      }),
    );
    driverRepo.find.mockResolvedValue([makeDriver()]);
    carRepo.find.mockResolvedValue([makeCar()]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', driverAvailability(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['car-1', vehicleAvailability(true)]]),
    );
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.route).toEqual({
      status: 'UNAVAILABLE',
      distanceMeters: null,
      durationSeconds: null,
      provider: null,
      calculatedAt: null,
    });
    expect(result.drivers.eligible).toHaveLength(1);
  });

  it('returns empty candidate lists when the service window is incomplete', async () => {
    requestRepo.findOne.mockResolvedValue(
      makeRequest({ expectedEndAt: null, expectedReturnAt: null }),
    );

    const result = await service.getDiagnostics('req-1');

    expect(result.request.serviceWindowComplete).toBe(false);
    expectNoCandidates(result);
    // No availability evaluation may run for an incomplete window.
    expect(driverRepo.find).not.toHaveBeenCalled();
    expect(carRepo.find).not.toHaveBeenCalled();
  });

  it('marks hasLiveLocation false when coordinates are absent or zero', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([
      makeDriver({ id: 'd-1', currentLatitude: 0, currentLongitude: 0 }),
      makeDriver({ id: 'd-2', currentLatitude: null, currentLongitude: null }),
      makeDriver({ id: 'd-3' }),
    ]);
    carRepo.find.mockResolvedValue([]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([
        ['d-1', driverAvailability(true)],
        ['d-2', driverAvailability(true)],
        ['d-3', driverAvailability(true)],
      ]),
    );
    availabilityService.checkVehicles.mockResolvedValue(new Map());
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible.map((d) => d.hasLiveLocation)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('excluded candidates are sorted by name then id', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    driverRepo.find.mockResolvedValue([
      makeDriver({ id: 'd-2', name: 'Zulu' }),
      makeDriver({ id: 'd-1', name: 'Alpha' }),
      makeDriver({ id: 'd-3', name: 'Alpha' }),
    ]);
    carRepo.find.mockResolvedValue([]);
    availabilityService.checkDrivers.mockResolvedValue(
      new Map([
        ['d-1', driverAvailability(false, ['NO_DUTY_SCHEDULE'])],
        ['d-2', driverAvailability(false, ['REST_DAY'])],
        ['d-3', driverAvailability(false, ['OUTSIDE_SHIFT'])],
      ]),
    );
    availabilityService.checkVehicles.mockResolvedValue(new Map());
    availabilityService.getCoveringOnDutyShifts.mockResolvedValue(new Map());
    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    const result = await service.getDiagnostics('req-1');

    expect(result.drivers.eligible).toEqual([]);
    expect(result.drivers.excluded.map((d) => d.driverId)).toEqual([
      'd-1',
      'd-3',
      'd-2',
    ]);
    expect(result.drivers.excluded[0].score).toBeNull();
  });
});

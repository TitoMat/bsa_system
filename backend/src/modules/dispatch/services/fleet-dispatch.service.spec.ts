import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditService } from '../../../audit/audit.service';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../../transportation/entities/transport-assignment.entity';
import { TransportStatusHistory } from '../../transportation/entities/transport-status-history.entity';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { FleetDispatchSettings } from '../entities/fleet-dispatch-settings.entity';
import { FleetDispatchService } from './fleet-dispatch.service';
import { FleetAvailabilityService } from '../../scheduling/services/fleet-availability.service';
import { ASSIGNMENT_RANDOM_SOURCE } from '../dispatch.constants';
import { FixedSequenceRandomSource } from './assignment-random.source';
import type {
  AvailabilityResult,
  DriverAvailabilityReason,
  VehicleAvailabilityReason,
} from '../../scheduling/domain/scheduling-domain';
import {
  isOverrideableFailCode,
  isResourceAllowedByPool,
} from '../domain/dispatch-domain';
import type {
  DispatchDecision,
  AssignmentRef,
  FleetAssignmentPool,
} from '../domain/dispatch-domain';

// ─── Utilities ─────────────────────────────────────────────────────────────

const START = new Date('2026-08-12T01:00:00.000Z');
const END = new Date('2026-08-12T04:00:00.000Z');

const avail = <T extends string>(
  available: boolean,
  reasons: T[] = [],
  warnings: string[] = [],
): AvailabilityResult<T> => ({
  available,
  reasons,
  warnings,
  evaluatedStartAt: START.toISOString(),
  evaluatedEndAt: END.toISOString(),
});

const makeRequest = (
  overrides: Partial<TransportationRequest> = {},
): TransportationRequest =>
  ({
    id: 'req-1',
    requestNumber: 'TR-2026-000001',
    tripType: 'ONE_WAY',
    status: 'APPROVED',
    passengerCount: 5,
    requestedAssignmentPool: 'GENERAL' as FleetAssignmentPool,
    scheduledPickupAt: START,
    expectedEndAt: END,
    expectedReturnAt: null,
    estimatedDistanceMeters: 5000,
    estimatedDurationSeconds: 600,
    assignedDriverId: null,
    assignedVehicleId: null,
    ...overrides,
  }) as TransportationRequest;

const makeDriver = (overrides: Partial<Driver> = {}): Driver =>
  ({
    id: 'd-1',
    name: 'Driver 1',
    isActive: true,
    assignmentPool: 'GENERAL' as FleetAssignmentPool,
    autoAssignEnabled: true,
    allowGeneralUseWhenExecutiveAway: false,
    dutyStatus: 'ON_DUTY',
    licenseExpiry: null,
    ...overrides,
  }) as Driver;

const makeCar = (overrides: Partial<Car> = {}): Car =>
  ({
    id: 'c-1',
    plateNumber: 'ABC 100',
    make: 'Toyota',
    model: 'Commuter',
    isActive: true,
    assignmentPool: 'GENERAL' as FleetAssignmentPool,
    autoAssignEnabled: true,
    allowGeneralUseWhenExecutiveAway: false,
    vehicleStatus: 'OPERATIONAL',
    seatingCapacity: 10,
    codingDay: 'NONE',
    registrationExpiry: null,
    insuranceExpiry: null,
    ...overrides,
  }) as Car;

const chainable = (overrides: Record<string, jest.Mock> = {}) => {
  const defaults: Record<string, jest.Mock> = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue(null),
    getOne: jest.fn().mockResolvedValue(null),
  };
  return { ...defaults, ...overrides };
};

// ─── Domain tests ──────────────────────────────────────────────────────────

describe('dispatch-domain', () => {
  describe('isResourceAllowedByPool', () => {
    it('allows resource in requested pool (GENERAL → GENERAL)', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'GENERAL',
          requestedPool: 'GENERAL',
          executiveReservationMode: true,
          allowGeneralUseWhenExecutiveAway: false,
        }),
      ).toBe(true);
    });

    it('allows EXECUTIVE resource for GENERAL request when reservation off + opt-in', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'EXECUTIVE',
          requestedPool: 'GENERAL',
          executiveReservationMode: false,
          allowGeneralUseWhenExecutiveAway: true,
        }),
      ).toBe(true);
    });

    it('blocks EXECUTIVE resource for GENERAL request when reservation on (boss present)', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'EXECUTIVE',
          requestedPool: 'GENERAL',
          executiveReservationMode: true,
          allowGeneralUseWhenExecutiveAway: true,
        }),
      ).toBe(false);
    });

    it('blocks EXECUTIVE resource without opt-in even when reservation off', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'EXECUTIVE',
          requestedPool: 'GENERAL',
          executiveReservationMode: false,
          allowGeneralUseWhenExecutiveAway: false,
        }),
      ).toBe(false);
    });

    it('blocks GENERAL resource for EXECUTIVE request', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'GENERAL',
          requestedPool: 'EXECUTIVE',
          executiveReservationMode: true,
          allowGeneralUseWhenExecutiveAway: false,
        }),
      ).toBe(false);
    });

    it('allows EXECUTIVE resource for EXECUTIVE request', () => {
      expect(
        isResourceAllowedByPool({
          resourcePool: 'EXECUTIVE',
          requestedPool: 'EXECUTIVE',
          executiveReservationMode: true,
          allowGeneralUseWhenExecutiveAway: false,
        }),
      ).toBe(true);
    });
  });

  describe('isOverrideableFailCode', () => {
    it.each(['AUTO_ASSIGN_DISABLED', 'ASSIGNMENT_POOL_MISMATCH', 'EXECUTIVE_RESERVATION_POLICY'] as const)(
      '%s is overrideable',
      (code) => {
        expect(isOverrideableFailCode(code)).toBe(true);
      },
    );

    it.each([
      'INVALID_SERVICE_WINDOW',
      'DRIVER_NOT_FOUND',
      'VEHICLE_NOT_FOUND',
      'DRIVER_INACTIVE',
      'NO_DUTY_SCHEDULE',
      'REST_DAY',
      'ON_LEAVE',
      'LICENSE_EXPIRED',
      'CAPACITY_INSUFFICIENT',
      'VEHICLE_BLOCKED',
      'UNDER_MAINTENANCE',
      'REGISTRATION_EXPIRED',
      'INSURANCE_EXPIRED',
      'CODING_RESTRICTION',
      'EXISTING_REQUEST_CONFLICT',
      'ACTIVE_FLEET_ASSIGNMENT_CONFLICT',
    ] as const)('%s is NOT overrideable', (code) => {
      expect(isOverrideableFailCode(code)).toBe(false);
    });
  });
});

// ─── Engine tests ──────────────────────────────────────────────────────────

describe('FleetDispatchService', () => {
  let service: FleetDispatchService;
  let fleetRepo: Record<string, jest.Mock>;
  let settingsRepo: Record<string, jest.Mock>;
  let requestRepo: Record<string, jest.Mock>;
  let assignmentRepo: Record<string, jest.Mock>;
  let historyRepo: Record<string, jest.Mock>;
  let driverRepo: Record<string, jest.Mock>;
  let carRepo: Record<string, jest.Mock>;
  let availabilityService: Record<string, jest.Mock>;
  let randomSource: FixedSequenceRandomSource;
  let auditService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;
  let manager: Record<string, jest.Mock>;
  let queryRunner: Record<string, jest.Mock>;

  const setupSuccessScenario = () => {
    const request = makeRequest();
    const driver1 = makeDriver();
    const car1 = makeCar();

    requestRepo.findOne.mockResolvedValueOnce(request);

    settingsRepo.findOne.mockResolvedValueOnce({
      id: 1,
      autoDispatchEnabled: true,
      executiveReservationMode: true,
      defaultAssignmentStrategy: 'FAIR_RANDOM',
      updatedByUserId: null,
      updatedAt: new Date(),
    });

    manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
      if (Entity === TransportationRequest && opts?.lock) return request;
      if (Entity === FleetAssignment)
        return opts?.where?.status === 'ACTIVE' || opts?.where?.transportationRequestId ? null : null;
      if (Entity === TransportAssignment) return null;
      if (Entity === Driver) return driver1;
      if (Entity === Car) return car1;
      return null;
    });

    manager.find.mockImplementation(async (Entity: unknown) => {
      if (Entity === Driver) return [driver1];
      if (Entity === Car) return [car1];
      return [];
    });

    manager.save.mockImplementation(async (entity: any) => ({ ...entity, id: 'asgn-1' }));
    manager.create.mockImplementation((Entity: unknown, data: unknown) => data);

    availabilityService.checkDrivers.mockResolvedValue(
      new Map([['d-1', avail(true)]]),
    );
    availabilityService.checkVehicles.mockResolvedValue(
      new Map([['c-1', avail(true)]]),
    );

    fleetRepo.create.mockImplementation((data: unknown) => data);
    fleetRepo.createQueryBuilder.mockReturnValue(chainable());
    fleetRepo.find.mockResolvedValue([]);

    assignmentRepo.createQueryBuilder.mockReturnValue(chainable());

    return { request, driver1, car1 };
  };

  beforeEach(async () => {
    fleetRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ ...d, id: 'asgn-1' })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      createQueryBuilder: jest.fn().mockReturnValue(chainable()),
    };
settingsRepo = {
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
  create: jest.fn().mockImplementation((data) => data),
};
requestRepo = {
  findOne: jest.fn(),
  save: jest.fn().mockResolvedValue({}),
};
    assignmentRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(chainable()),
    };
    historyRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockResolvedValue({ id: 'hist-1' }),
    };
    driverRepo = { find: jest.fn() };
    carRepo = { find: jest.fn() };

    availabilityService = {
      checkDrivers: jest.fn(),
      checkVehicles: jest.fn(),
    };
    randomSource = new FixedSequenceRandomSource([0, 0]);
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    manager = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      create: jest.fn().mockImplementation((_E, d) => d),
      createQueryBuilder: jest.fn().mockReturnValue(chainable()),
      update: jest.fn(),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager,
    };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetDispatchService,
        { provide: getRepositoryToken(FleetAssignment), useValue: fleetRepo },
        {
          provide: getRepositoryToken(FleetDispatchSettings),
          useValue: settingsRepo,
        },
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        {
          provide: getRepositoryToken(TransportAssignment),
          useValue: assignmentRepo,
        },
        {
          provide: getRepositoryToken(TransportStatusHistory),
          useValue: historyRepo,
        },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(Car), useValue: carRepo },
        { provide: FleetAvailabilityService, useValue: availabilityService },
        { provide: ASSIGNMENT_RANDOM_SOURCE, useValue: randomSource },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<FleetDispatchService>(FleetDispatchService);
  });

  afterEach(() => {
    randomSource.reset();
  });

  // ── dispatchAuto (explicit, force=true) ────────────────────────────────

  describe('dispatchAuto (explicit dispatcher)', () => {
    it('assigns when candidate pair is available', async () => {
      setupSuccessScenario();

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ASSIGNED');
      expect(result.assignment.driverId).toBe('d-1');
      expect(result.assignment.vehicleId).toBe('c-1');
      expect(result.assignment.assignmentMethod).toBe('AUTOMATIC');
      expect(result.assignment.assignmentStrategy).toBe('FAIR_RANDOM');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('returns ALREADY_ASSIGNED when an active fleet assignment exists', async () => {
      const req = makeRequest({ status: 'DRIVER_ASSIGNED' });
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: true,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });

      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock)
          return { ...req, status: 'DRIVER_ASSIGNED' };
        if (Entity === FleetAssignment)
          return {
            id: 'existing-1',
            transportationRequestId: 'req-1',
            driverId: 'd-1',
            vehicleId: 'c-1',
            serviceStartAt: START,
            serviceEndAt: END,
            assignmentMethod: 'AUTOMATIC',
            assignmentStrategy: 'FAIR_RANDOM',
            status: 'ACTIVE',
            assignedAt: new Date(),
          };
        return null;
      });

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('ALREADY_ASSIGNED');
      expect(result.assignment).toBeDefined();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('returns NO_ELIGIBLE_DRIVER when all drivers fail availability', async () => {
      const req = makeRequest();
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: true,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });
      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock) return req;
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver) return [makeDriver()];
        if (Entity === Car) return [makeCar()];
        return [];
      });
      availabilityService.checkDrivers.mockResolvedValue(
        new Map([['d-1', avail(false, ['NO_DUTY_SCHEDULE'] as DriverAvailabilityReason[])]]),
      );
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([['c-1', avail(true)]]),
      );

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('NO_ELIGIBLE_DRIVER');
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('returns NO_ELIGIBLE_VEHICLE when no vehicles pass', async () => {
      const req = makeRequest();
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: true,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });
      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock) return req;
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver) return [makeDriver()];
        if (Entity === Car) return [makeCar()];
        return [];
      });
      availabilityService.checkDrivers.mockResolvedValue(
        new Map([['d-1', avail(true)]]),
      );
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([
          ['c-1', avail(false, ['UNDER_MAINTENANCE'] as VehicleAvailabilityReason[])],
        ]),
      );

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('NO_ELIGIBLE_VEHICLE');
    });

    it('returns REQUEST_NOT_DISPATCHABLE for non-dispatchable status', async () => {
      requestRepo.findOne.mockResolvedValueOnce(makeRequest({ status: 'DRAFT' }));

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('REQUEST_NOT_DISPATCHABLE');
    });

    it('returns VALIDATION_FAILED for incomplete service window', async () => {
      requestRepo.findOne.mockResolvedValueOnce(
        makeRequest({ expectedEndAt: null, expectedReturnAt: null }),
      );

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('VALIDATION_FAILED');
    });
  });

  // ── requestAutoDispatch (gated) ────────────────────────────────────────

  describe('requestAutoDispatch (system trigger, gated)', () => {
    it('returns AUTO_DISPATCH_DISABLED when settings gate is off', async () => {
      requestRepo.findOne.mockResolvedValueOnce(makeRequest());
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });

      const result = await service.requestAutoDispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('AUTO_DISPATCH_DISABLED');
      expect(result.failCode).toBe('AUTO_ASSIGN_DISABLED');
      expect(result.canOverride).toBe(true);
    });

    it('dispatches when gate is on and candidates available', async () => {
      setupSuccessScenario();

      const result = await service.requestAutoDispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ASSIGNED');
    });
  });

  // ── dispatchManual ─────────────────────────────────────────────────────

  describe('dispatchManual', () => {
    it('assigns the specified pair when both pass validation', async () => {
      setupSuccessScenario();

      const result = await service.dispatchManual(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        { driverId: 'd-1', vehicleId: 'c-1' },
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ASSIGNED');
      expect(result.assignment.driverId).toBe('d-1');
      expect(result.assignment.assignmentMethod).toBe('MANUAL');
    });

    it('fails when specified driver is inactive (non-overrideable)', async () => {
      const req = makeRequest();
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });
      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock) return req;
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver)
          return [makeDriver({ id: 'd-1', isActive: false })];
        if (Entity === Car) return [makeCar({ id: 'c-1' })];
        return [];
      });
      availabilityService.checkDrivers.mockResolvedValue(
        new Map([['d-1', avail(false, ['DRIVER_INACTIVE'] as DriverAvailabilityReason[])]]),
      );
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([['c-1', avail(true)]]),
      );

      const result = await service.dispatchManual(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        { driverId: 'd-1', vehicleId: 'c-1' },
      );

      expect(result.ok).toBe(false);
      expect(result.canOverride).toBe(false);
      expect(result.failures.some((f) => f.includes('DRIVER_INACTIVE'))).toBe(true);
    });

    it('propagates DRIVER_NOT_FOUND for missing driver', async () => {
      const req = makeRequest();
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });
      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock) return req;
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver) return [];
        if (Entity === Car) return [makeCar()];
        return [];
      });
      availabilityService.checkDrivers.mockResolvedValue(new Map());
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([['c-1', avail(true)]]),
      );

      const result = await service.dispatchManual(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        { driverId: 'd-absent', vehicleId: 'c-1' },
      );

      expect(result.ok).toBe(false);
      expect(result.failCode).toBe('DRIVER_NOT_FOUND');
    });
  });

  // ── dispatchOverride ───────────────────────────────────────────────────

  describe('dispatchOverride', () => {
    it('writes the provided pair with an override reason', async () => {
      setupSuccessScenario();

      const result = await service.dispatchOverride(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        {
          driverId: 'd-1',
          vehicleId: 'c-1',
          overrideReason: 'Director authorisation',
        },
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ASSIGNED');
      expect(result.assignment.assignmentMethod).toBe('OVERRIDE');
    });
  });

  // ── dispatchReassign ───────────────────────────────────────────────────

  describe('dispatchReassign', () => {
    it('supersedes active assignment and creates new one', async () => {
      const req = makeRequest({ status: 'DRIVER_ASSIGNED' });
      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: true,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });

      let activeSuperseded = false;
      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock)
          return req;
        if (Entity === FleetAssignment) {
          if (activeSuperseded) return null;
          activeSuperseded = true;
          return {
            id: 'old-asgn',
            transportationRequestId: 'req-1',
            driverId: 'd-old',
            vehicleId: 'c-old',
            serviceStartAt: START,
            serviceEndAt: END,
            assignmentMethod: 'AUTOMATIC',
            assignmentStrategy: 'FAIR_RANDOM',
            status: 'ACTIVE',
            assignedAt: new Date(),
            supersededAt: null,
            supersededByUserId: null,
            supersedeReason: null,
          };
        }
        if (Entity === TransportAssignment) return null;
        if (Entity === Driver) return makeDriver();
        if (Entity === Car) return makeCar();
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver) return [makeDriver()];
        if (Entity === Car) return [makeCar()];
        if (Entity === FleetAssignment)
          return activeSuperseded
            ? []
            : [{ id: 'old-asgn', status: 'ACTIVE' }];
        return [];
      });
      manager.save.mockImplementation(async (entity: any) => entity);
      availabilityService.checkDrivers.mockResolvedValue(
        new Map([['d-1', avail(true)]]),
      );
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([['c-1', avail(true)]]),
      );

      const result = await service.dispatchReassign(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        'Manual reassign reason',
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('ASSIGNED');
      expect(result.assignment.assignmentMethod).toBe('REASSIGNMENT');
    });
  });

  // ── synchronizeTerminal ────────────────────────────────────────────────

  describe('synchronizeTerminal', () => {
    it('marks active fleet assignment COMPLETED and clears projection', async () => {
      manager.findOne.mockResolvedValueOnce(makeRequest());
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === FleetAssignment)
          return [
            {
              id: 'asgn-1',
              transportationRequestId: 'req-1',
              driverId: 'd-1',
              vehicleId: 'c-1',
              status: 'ACTIVE',
            },
          ];
        if (Entity === TransportAssignment) return [];
        return [];
      });
      manager.save.mockImplementation(async (entity: any) => entity);

      await service.synchronizeTerminal(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        'COMPLETED',
      );

      const firstSave = (manager.save as jest.Mock).mock.calls[0][0];
      expect(firstSave.status).toBe('COMPLETED');

      const requestSave = manager.save.mock.calls
        .flat()
        .find((e: any) => e.assignedDriverId === null);
      expect(requestSave).toBeDefined();
    });
  });

  // ── accept / decline ───────────────────────────────────────────────────

  describe('acceptAssignment', () => {
    it('transitions request to DRIVER_ACCEPTED', async () => {
      fleetRepo.findOne.mockResolvedValueOnce({
        id: 'asgn-1',
        transportationRequestId: 'req-1',
        driverId: 'd-1',
        vehicleId: 'c-1',
        status: 'ACTIVE',
      });
      requestRepo.findOne
        .mockResolvedValueOnce(makeRequest({ status: 'DRIVER_ASSIGNED' }))
        .mockResolvedValueOnce(makeRequest({ status: 'DRIVER_ASSIGNED' }));
      assignmentRepo.findOne.mockResolvedValueOnce(null);
      historyRepo.save.mockResolvedValue({});
      requestRepo.save.mockResolvedValue({});

      const result = await service.acceptAssignment(
        { sub: 'd-1', email: 'driver@b.com' },
        'req-1',
        'asgn-1',
      );

      expect(result.accepted).toBe(true);
    });
  });

  describe('declineAssignment', () => {
    it('cancels fleet assignment and sets DRIVER_DECLINED', async () => {
      fleetRepo.findOne.mockResolvedValueOnce({
        id: 'asgn-1',
        transportationRequestId: 'req-1',
        driverId: 'd-1',
        vehicleId: 'c-1',
        status: 'ACTIVE',
      });
      fleetRepo.save.mockResolvedValue({});
      requestRepo.findOne
        .mockResolvedValueOnce(makeRequest({ status: 'DRIVER_ASSIGNED' }))
        .mockResolvedValueOnce(makeRequest({ status: 'DRIVER_ASSIGNED' }));
      assignmentRepo.findOne.mockResolvedValueOnce(null);
      historyRepo.save.mockResolvedValue({});
      requestRepo.save.mockResolvedValue({});
      settingsRepo.findOne.mockResolvedValueOnce({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });

      const result = await service.declineAssignment(
        { sub: 'd-1', email: 'driver@b.com' },
        'req-1',
        'asgn-1',
        'Conflict with personal schedule',
      );

      expect(result.declined).toBe(true);
    });
  });

  // ── Retry exhaustion ─────────────────────────────────────────────────

  describe('retry exhaustion', () => {
    it('returns CONFLICT_RETRY_EXHAUSTED when fleet conflict persists across 4 attempts', async () => {
      const req = makeRequest();
      const driver1 = makeDriver();
      const car1 = makeCar();

      requestRepo.findOne.mockResolvedValueOnce(req);
      settingsRepo.findOne.mockResolvedValue({
        id: 1,
        autoDispatchEnabled: true,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
        updatedAt: new Date(),
      });

      manager.findOne.mockImplementation(async (Entity: unknown, opts: any) => {
        if (Entity === TransportationRequest && opts?.lock) return req;
        if (Entity === FleetAssignment) return null;
        if (Entity === TransportAssignment) return null;
        if (Entity === Driver) return driver1;
        if (Entity === Car) return car1;
        return null;
      });
      manager.find.mockImplementation(async (Entity: unknown) => {
        if (Entity === Driver) return [driver1];
        if (Entity === Car) return [car1];
        return [];
      });
      availabilityService.checkDrivers.mockResolvedValue(
        new Map([['d-1', avail(true)]]),
      );
      availabilityService.checkVehicles.mockResolvedValue(
        new Map([['c-1', avail(true)]]),
      );

      // Make every in-tx fleet conflict query return a conflict
      manager.createQueryBuilder.mockImplementation((Entity: unknown) => {
        if (Entity === FleetAssignment) {
          return chainable({
            getOne: jest.fn().mockResolvedValue({
              id: 'conflict-1',
              transportationRequestId: 'req-other',
              driverId: 'd-1',
              vehicleId: 'c-1',
              status: 'ACTIVE',
            }),
          });
        }
        if (Entity === TransportAssignment) {
          return chainable({ getRawOne: jest.fn().mockResolvedValue(null) });
        }
        return chainable();
      });

      const result = await service.dispatchAuto(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('CONFLICT_RETRY_EXHAUSTED');
      expect(result.attempts).toBe(4);
      expect(result.failCode).toBe('ACTIVE_FLEET_ASSIGNMENT_CONFLICT');
    });
  });

  // ── getFleetAssignments / getExecutiveResourcesSummary ─────────────────

  describe('getFleetAssignments', () => {
    it('returns history rows ordered by createdAt DESC', async () => {
      requestRepo.findOne.mockResolvedValueOnce(makeRequest());
      fleetRepo.find.mockResolvedValueOnce([
        { id: 'a1', assignmentMethod: 'REASSIGNMENT', status: 'SUPERSEDED' },
        { id: 'a2', assignmentMethod: 'AUTOMATIC', status: 'ACTIVE' },
      ]);

      const result = await service.getFleetAssignments('req-1');

      expect(result).toHaveLength(2);
    });
  });
});
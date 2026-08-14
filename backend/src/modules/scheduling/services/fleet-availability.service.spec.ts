import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { DriverDutySchedule } from '../entities/driver-duty-schedule.entity';
import { VehicleAvailabilityBlock } from '../entities/vehicle-availability-block.entity';
import { FleetAvailabilityService } from './fleet-availability.service';

describe('FleetAvailabilityService', () => {
  let service: FleetAvailabilityService;
  let driverRepo: { findOne: jest.Mock };
  let carRepo: { findOne: jest.Mock };
  let scheduleRepo: { find: jest.Mock };
  let blockRepo: { createQueryBuilder: jest.Mock };

  // 2026-08-12 09:00 Asia/Manila (Wednesday) → 12:00
  const START = new Date('2026-08-12T01:00:00.000Z');
  const END = new Date('2026-08-12T04:00:00.000Z');

  const makeDriver = (overrides: Partial<Driver> = {}) =>
    ({
      id: 'driver-1',
      name: 'Juan',
      licenseNumber: 'D00-00-000000',
      isActive: true,
      dutyStatus: 'OFF_DUTY',
      licenseExpiry: null,
      assignmentPool: 'GENERAL',
      autoAssignEnabled: true,
      allowGeneralUseWhenExecutiveAway: false,
      ...overrides,
    }) as Driver;

  const makeCar = (overrides: Partial<Car> = {}) =>
    ({
      id: 'car-1',
      make: 'Toyota',
      model: 'Camry',
      plateNumber: 'ABC-1234',
      isActive: true,
      vehicleStatus: 'OPERATIONAL',
      seatingCapacity: 5,
      autoAssignEnabled: true,
      registrationExpiry: null,
      insuranceExpiry: null,
      codingDay: 'NONE',
      assignmentPool: 'GENERAL',
      allowGeneralUseWhenExecutiveAway: false,
      ...overrides,
    }) as Car;

  // ON_DUTY 08:00–18:00 PH on 2026-08-12 (covers 09:00–12:00).
  const onDutySchedule = {
    driverId: 'driver-1',
    scheduleDate: '2026-08-12',
    shiftStart: '08:00',
    shiftEnd: '18:00',
    status: 'ON_DUTY',
  } as DriverDutySchedule;

  beforeEach(async () => {
    driverRepo = { findOne: jest.fn() };
    carRepo = { findOne: jest.fn() };
    scheduleRepo = { find: jest.fn() };

    const chainable = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };
    blockRepo = { createQueryBuilder: jest.fn().mockReturnValue(chainable) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetAvailabilityService,
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: getRepositoryToken(Car), useValue: carRepo },
        {
          provide: getRepositoryToken(DriverDutySchedule),
          useValue: scheduleRepo,
        },
        {
          provide: getRepositoryToken(VehicleAvailabilityBlock),
          useValue: blockRepo,
        },
      ],
    }).compile();

    service = module.get<FleetAvailabilityService>(FleetAvailabilityService);
  });

  // ─── Driver ────────────────────────────────────────────────────────────────

  describe('checkDriver', () => {
    it('available with an ON_DUTY schedule covering the window', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      scheduleRepo.find.mockResolvedValue([onDutySchedule]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('no schedule → NO_DUTY_SCHEDULE', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      scheduleRepo.find.mockResolvedValue([]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('NO_DUTY_SCHEDULE');
    });

    it('partial on-duty coverage → OUTSIDE_SHIFT', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      // Shift 10:00–18:00 only covers the tail of the window.
      scheduleRepo.find.mockResolvedValue([
        {
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '10:00',
          shiftEnd: '18:00',
          status: 'ON_DUTY',
        },
      ]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('OUTSIDE_SHIFT');
    });

    it('REST_DAY schedule → REST_DAY', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      scheduleRepo.find.mockResolvedValue([
        {
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '08:00',
          shiftEnd: '18:00',
          status: 'REST_DAY',
        },
      ]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('REST_DAY');
    });

    it('LEAVE schedule → ON_LEAVE', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      scheduleRepo.find.mockResolvedValue([
        {
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '08:00',
          shiftEnd: '18:00',
          status: 'LEAVE',
        },
      ]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('ON_LEAVE');
    });

    it('UNAVAILABLE schedule → DRIVER_UNAVAILABLE', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      scheduleRepo.find.mockResolvedValue([
        {
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '08:00',
          shiftEnd: '18:00',
          status: 'UNAVAILABLE',
        },
      ]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.reasons).toContain('DRIVER_UNAVAILABLE');
    });

    it('autoAssignEnabled=false → AUTO_ASSIGN_DISABLED', async () => {
      driverRepo.findOne.mockResolvedValue(
        makeDriver({ autoAssignEnabled: false }),
      );
      scheduleRepo.find.mockResolvedValue([onDutySchedule]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('AUTO_ASSIGN_DISABLED');
    });

    it('inactive driver → DRIVER_INACTIVE', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver({ isActive: false }));
      scheduleRepo.find.mockResolvedValue([onDutySchedule]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.reasons).toContain('DRIVER_INACTIVE');
    });

    it('expired license → LICENSE_EXPIRED', async () => {
      driverRepo.findOne.mockResolvedValue(
        makeDriver({ licenseExpiry: '2025-12-31' }),
      );
      scheduleRepo.find.mockResolvedValue([onDutySchedule]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('LICENSE_EXPIRED');
    });

    it('license expiring inside the window → LICENSE_EXPIRED warning only', async () => {
      driverRepo.findOne.mockResolvedValue(
        makeDriver({ licenseExpiry: '2026-08-12' }),
      );
      // Overnight shift Aug 12 08:00 → Aug 13 04:00 PH; window 09:00 Aug 12 →
      // 04:00 Aug 13 PH crosses the expiry date's end-of-day (23:59 Aug 12 PH).
      scheduleRepo.find.mockResolvedValue([
        {
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '08:00',
          shiftEnd: '04:00',
          status: 'ON_DUTY',
        },
      ]);
      const windowEnd = new Date('2026-08-12T20:00:00.000Z');

      const result = await service.checkDriver('driver-1', START, windowEnd);

      expect(result.available).toBe(true);
      expect(result.warnings).toContain('LICENSE_EXPIRED');
    });

    it('live SUSPENDED flag → DRIVER_UNAVAILABLE', async () => {
      driverRepo.findOne.mockResolvedValue(
        makeDriver({ dutyStatus: 'SUSPENDED' }),
      );
      scheduleRepo.find.mockResolvedValue([onDutySchedule]);

      const result = await service.checkDriver('driver-1', START, END);

      expect(result.reasons).toContain('DRIVER_UNAVAILABLE');
    });

    it('missing driver → DRIVER_NOT_FOUND', async () => {
      driverRepo.findOne.mockResolvedValue(null);

      const result = await service.checkDriver('missing', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toEqual(['DRIVER_NOT_FOUND']);
    });

    it('rejects an invalid time range', async () => {
      await expect(
        service.checkDriver('driver-1', END, START),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  // ─── Vehicle ───────────────────────────────────────────────────────────────

  describe('checkVehicle', () => {
    const blockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };

    beforeEach(() => {
      blockRepo.createQueryBuilder.mockReturnValue(blockQueryBuilder);
      blockQueryBuilder.getRawMany.mockResolvedValue([]);
    });

    it('available for the window', async () => {
      carRepo.findOne.mockResolvedValue(makeCar());

      const result = await service.checkVehicle('car-1', START, END, 4);

      expect(result.available).toBe(true);
      expect(result.reasons).toEqual([]);
    });

    it('overlapping block → VEHICLE_BLOCKED', async () => {
      carRepo.findOne.mockResolvedValue(makeCar());
      blockQueryBuilder.getRawMany.mockResolvedValue([
        { vehicleId: 'car-1', count: '1' },
      ]);

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('VEHICLE_BLOCKED');
    });

    it('passengers exceed capacity → CAPACITY_INSUFFICIENT', async () => {
      carRepo.findOne.mockResolvedValue(makeCar({ seatingCapacity: 4 }));

      const result = await service.checkVehicle('car-1', START, END, 5);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('CAPACITY_INSUFFICIENT');
    });

    it('autoAssignEnabled=false → AUTO_ASSIGN_DISABLED', async () => {
      carRepo.findOne.mockResolvedValue(makeCar({ autoAssignEnabled: false }));

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.reasons).toContain('AUTO_ASSIGN_DISABLED');
    });

    it('MAINTENANCE status → UNDER_MAINTENANCE', async () => {
      carRepo.findOne.mockResolvedValue(
        makeCar({ vehicleStatus: 'MAINTENANCE' }),
      );

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('UNDER_MAINTENANCE');
    });

    it('OUT_OF_SERVICE status → VEHICLE_INACTIVE', async () => {
      carRepo.findOne.mockResolvedValue(
        makeCar({ vehicleStatus: 'OUT_OF_SERVICE' }),
      );

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.reasons).toContain('VEHICLE_INACTIVE');
    });

    it('inactive vehicle → VEHICLE_INACTIVE', async () => {
      carRepo.findOne.mockResolvedValue(makeCar({ isActive: false }));

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.reasons).toContain('VEHICLE_INACTIVE');
    });

    it('expired registration → REGISTRATION_EXPIRED', async () => {
      carRepo.findOne.mockResolvedValue(
        makeCar({ registrationExpiry: '2026-01-31' }),
      );

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('REGISTRATION_EXPIRED');
    });

    it('expired insurance → INSURANCE_EXPIRED', async () => {
      carRepo.findOne.mockResolvedValue(
        makeCar({ insuranceExpiry: '2026-01-31' }),
      );

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.reasons).toContain('INSURANCE_EXPIRED');
    });

    it('registration expiring inside the window → warning only', async () => {
      carRepo.findOne.mockResolvedValue(
        makeCar({ registrationExpiry: '2026-08-12' }),
      );
      // Window 09:00 Aug 12 → 04:00 Aug 13 PH crosses the expiry date's end-of-day.
      const windowEnd = new Date('2026-08-12T20:00:00.000Z');

      const result = await service.checkVehicle('car-1', START, windowEnd);

      expect(result.available).toBe(true);
      expect(result.warnings).toContain('REGISTRATION_EXPIRED');
    });

    it('coding day matches requested day → CODING_RESTRICTION', async () => {
      // 2026-08-12 is a WEDNESDAY in Asia/Manila.
      carRepo.findOne.mockResolvedValue(makeCar({ codingDay: 'WEDNESDAY' }));

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toContain('CODING_RESTRICTION');
    });

    it('coding day does not match requested day → no restriction', async () => {
      carRepo.findOne.mockResolvedValue(makeCar({ codingDay: 'MONDAY' }));

      const result = await service.checkVehicle('car-1', START, END);

      expect(result.reasons).not.toContain('CODING_RESTRICTION');
    });

    it('missing vehicle → VEHICLE_NOT_FOUND', async () => {
      carRepo.findOne.mockResolvedValue(null);

      const result = await service.checkVehicle('missing', START, END);

      expect(result.available).toBe(false);
      expect(result.reasons).toEqual(['VEHICLE_NOT_FOUND']);
    });
  });

  // ─── Batch variants (R3 Step 30) ───────────────────────────────────────────

  describe('checkDrivers', () => {
    it('evaluates every driver with one schedules lookup', async () => {
      scheduleRepo.find.mockResolvedValue([
        onDutySchedule,
        {
          driverId: 'driver-2',
          scheduleDate: '2026-08-12',
          shiftStart: '08:00',
          shiftEnd: '18:00',
          status: 'REST_DAY',
        },
      ]);

      const result = await service.checkDrivers(
        [makeDriver(), makeDriver({ id: 'driver-2' })],
        START,
        END,
      );

      expect(result.get('driver-1')).toEqual(
        expect.objectContaining({ available: true, reasons: [] }),
      );
      expect(result.get('driver-2').reasons).toContain('REST_DAY');
      expect(scheduleRepo.find).toHaveBeenCalledTimes(1);
    });

    it('handles an empty driver list', async () => {
      const result = await service.checkDrivers([], START, END);

      expect(result.size).toBe(0);
      expect(scheduleRepo.find).not.toHaveBeenCalled();
    });

    it('rejects an invalid time range like the single path', async () => {
      await expect(
        service.checkDrivers([makeDriver()], END, START),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('checkVehicles', () => {
    const batchQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
    };

    beforeEach(() => {
      blockRepo.createQueryBuilder.mockReturnValue(batchQueryBuilder);
      batchQueryBuilder.getRawMany.mockResolvedValue([]);
    });

    it('evaluates every vehicle with one blocks lookup', async () => {
      batchQueryBuilder.getRawMany.mockResolvedValue([
        { vehicleId: 'car-1', count: '1' },
      ]);

      const result = await service.checkVehicles(
        [makeCar(), makeCar({ id: 'car-2' })],
        START,
        END,
        4,
      );

      expect(result.get('car-1').reasons).toContain('VEHICLE_BLOCKED');
      expect(result.get('car-2')).toEqual(
        expect.objectContaining({ available: true, reasons: [] }),
      );
      expect(blockRepo.createQueryBuilder).toHaveBeenCalledTimes(1);
    });

    it('flags capacity per vehicle in the same pass', async () => {
      const result = await service.checkVehicles(
        [makeCar({ id: 'car-1', seatingCapacity: 4 })],
        START,
        END,
        5,
      );

      expect(result.get('car-1').reasons).toContain('CAPACITY_INSUFFICIENT');
      expect(result.get('car-1')).toEqual(
        expect.objectContaining({ available: false }),
      );
    });

    it('handles an empty vehicle list', async () => {
      const result = await service.checkVehicles([], START, END);

      expect(result.size).toBe(0);
      expect(blockRepo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });
});

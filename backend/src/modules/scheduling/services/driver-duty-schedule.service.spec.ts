import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { Driver } from '../../catalog/drivers/driver.entity';
import { DriverDutySchedule } from '../entities/driver-duty-schedule.entity';
import { DriverDutyScheduleService } from './driver-duty-schedule.service';

describe('DriverDutyScheduleService', () => {
  let service: DriverDutyScheduleService;
  let scheduleRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };
  let driverRepo: { findOne: jest.Mock };
  let auditService: { log: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  const makeSchedule = (overrides: Partial<DriverDutySchedule> = {}) =>
    ({
      id: 'sch-1',
      driverId: 'driver-1',
      scheduleDate: '2026-08-12',
      shiftStart: '07:30',
      shiftEnd: '19:30',
      status: 'ON_DUTY',
      notes: null,
      createdByUserId: 'actor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as DriverDutySchedule;

  const buildCreate = (payload: Record<string, unknown>) =>
    payload as unknown as Parameters<DriverDutyScheduleService['create']>[0];

  beforeEach(async () => {
    scheduleRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };
    driverRepo = { findOne: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverDutyScheduleService,
        {
          provide: getRepositoryToken(DriverDutySchedule),
          useValue: scheduleRepo,
        },
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DriverDutyScheduleService>(DriverDutyScheduleService);
  });

  describe('create', () => {
    it('creates a normal shift', async () => {
      driverRepo.findOne.mockResolvedValue({ id: 'driver-1' });
      scheduleRepo.create.mockImplementation((input: DriverDutySchedule) => ({
        ...input,
        id: 'sch-new',
      }));
      scheduleRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreate({
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '07:30',
          shiftEnd: '19:30',
        }),
        actor,
      );

      expect(result.status).toBe('ON_DUTY');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_DRIVER_DUTY_SCHEDULE' }),
      );
    });

    it('creates an overnight shift', async () => {
      driverRepo.findOne.mockResolvedValue({ id: 'driver-1' });
      scheduleRepo.create.mockImplementation((input: DriverDutySchedule) => ({
        ...input,
        id: 'sch-new',
      }));
      scheduleRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreate({
          driverId: 'driver-1',
          scheduleDate: '2026-08-12',
          shiftStart: '12:00',
          shiftEnd: '00:00',
        }),
        actor,
      );

      expect(result.shiftStart).toBe('12:00');
      expect(result.shiftEnd).toBe('00:00');
    });

    it('creates a REST_DAY record', async () => {
      driverRepo.findOne.mockResolvedValue({ id: 'driver-1' });
      scheduleRepo.create.mockImplementation((input: DriverDutySchedule) => ({
        ...input,
        id: 'sch-new',
      }));
      scheduleRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreate({
          driverId: 'driver-1',
          scheduleDate: '2026-08-13',
          shiftStart: '08:00',
          shiftEnd: '17:00',
          status: 'REST_DAY',
        }),
        actor,
      );

      expect(result.status).toBe('REST_DAY');
    });

    it('rejects a missing driver', async () => {
      driverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          buildCreate({
            driverId: 'missing',
            scheduleDate: '2026-08-12',
            shiftStart: '08:00',
            shiftEnd: '17:00',
          }),
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a zero-length shift', async () => {
      driverRepo.findOne.mockResolvedValue({ id: 'driver-1' });

      await expect(
        service.create(
          buildCreate({
            driverId: 'driver-1',
            scheduleDate: '2026-08-12',
            shiftStart: '08:00',
            shiftEnd: '08:00',
          }),
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a malformed time', async () => {
      driverRepo.findOne.mockResolvedValue({ id: 'driver-1' });

      await expect(
        service.create(
          buildCreate({
            driverId: 'driver-1',
            scheduleDate: '2026-08-12',
            shiftStart: '25:99',
            shiftEnd: '17:00',
          }),
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('applies whitelisted mutable fields with re-validation', async () => {
      scheduleRepo.findOne.mockResolvedValue(makeSchedule());
      scheduleRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'sch-1',
        {
          shiftStart: '12:00',
          shiftEnd: '00:00',
          status: 'ON_DUTY',
          notes: 'overnight',
        } as never,
        actor,
      );

      expect(result.shiftStart).toBe('12:00');
      expect(result.shiftEnd).toBe('00:00');
      expect(result.notes).toBe('overnight');
    });
  });

  describe('remove', () => {
    it('deletes explicitly and audits', async () => {
      scheduleRepo.findOne.mockResolvedValue(makeSchedule());
      scheduleRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('sch-1', actor);

      expect(scheduleRepo.delete).toHaveBeenCalledWith({ id: 'sch-1' });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'DELETE_DRIVER_DUTY_SCHEDULE' }),
      );
    });

    it('throws when the schedule does not exist', async () => {
      scheduleRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

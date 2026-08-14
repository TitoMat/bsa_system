import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { DriverService } from './driver.service';
import { Driver } from './driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

describe('DriverService', () => {
  let service: DriverService;
  let driverRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  const makeDriver = (overrides: Partial<Driver> = {}) =>
    ({
      id: 'driver-1',
      name: 'Juan Dela Cruz',
      licenseNumber: 'D01-23-456789',
      contactNumber: null,
      address: null,
      isActive: true,
      dutyStatus: 'OFF_DUTY',
      licenseExpiry: null,
      currentLatitude: null,
      currentLongitude: null,
      assignmentPool: 'GENERAL',
      autoAssignEnabled: true,
      allowGeneralUseWhenExecutiveAway: false,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    }) as Driver;

  const buildCreateDto = (payload: Record<string, unknown>): CreateDriverDto =>
    payload as unknown as CreateDriverDto;

  const buildUpdateDto = (payload: Record<string, unknown>): UpdateDriverDto =>
    payload as unknown as UpdateDriverDto;

  beforeEach(async () => {
    driverRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: getRepositoryToken(Driver), useValue: driverRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
  });

  describe('create', () => {
    it('applies fleet-scheduler defaults when omitted', async () => {
      driverRepo.create.mockImplementation((input) => ({
        ...input,
        id: 'driver-new',
      }));
      driverRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreateDto({
          name: 'Maria Santos',
          licenseNumber: 'D00-00-000000',
        }),
        actor,
      );

      expect(result.assignmentPool).toBe('GENERAL');
      expect(result.autoAssignEnabled).toBe(true);
      expect(result.allowGeneralUseWhenExecutiveAway).toBe(false);
      expect(result.dutyStatus).toBe('OFF_DUTY');
      expect(result.isActive).toBe(true);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_DRIVER',
          targetId: 'driver-new',
        }),
      );
    });

    it('honors explicit fleet-scheduler values', async () => {
      driverRepo.create.mockImplementation((input) => ({
        ...input,
        id: 'driver-new',
      }));
      driverRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreateDto({
          name: 'Maria Santos',
          licenseNumber: 'D00-00-000000',
          assignmentPool: 'EXECUTIVE',
          autoAssignEnabled: false,
          allowGeneralUseWhenExecutiveAway: true,
          isActive: false,
        }),
        actor,
      );

      expect(result.assignmentPool).toBe('EXECUTIVE');
      expect(result.autoAssignEnabled).toBe(false);
      expect(result.allowGeneralUseWhenExecutiveAway).toBe(true);
      expect(result.isActive).toBe(false);
    });
  });

  describe('update', () => {
    it('applies whitelisted mutable fields', async () => {
      driverRepo.findOne.mockResolvedValue(makeDriver());
      driverRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'driver-1',
        buildUpdateDto({
          dutyStatus: 'ON_DUTY',
          licenseExpiry: '2027-06-30',
          assignmentPool: 'EXECUTIVE',
          autoAssignEnabled: false,
          allowGeneralUseWhenExecutiveAway: true,
        }),
        actor,
      );

      expect(result.dutyStatus).toBe('ON_DUTY');
      expect(result.licenseExpiry).toBe('2027-06-30');
      expect(result.assignmentPool).toBe('EXECUTIVE');
      expect(result.autoAssignEnabled).toBe(false);
      expect(result.allowGeneralUseWhenExecutiveAway).toBe(true);
    });

    it('never writes system-owned or non-whitelisted fields', async () => {
      const existing = makeDriver({
        currentLatitude: 14.5995124,
        currentLongitude: 120.9842195,
        dutyStatus: 'ON_DUTY',
      });
      driverRepo.findOne.mockResolvedValue(existing);
      driverRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'driver-1',
        buildUpdateDto({
          currentLatitude: 99.123,
          currentLongitude: -1.5,
          id: 'hacked-id',
          createdAt: new Date('2000-01-01T00:00:00Z'),
          dutyStatus: 'ON_LEAVE',
        }),
        actor,
      );

      expect(result.id).toBe('driver-1');
      expect(result.createdAt).toEqual(new Date('2026-08-01T00:00:00Z'));
      expect(result.currentLatitude).toBe(14.5995124);
      expect(result.currentLongitude).toBe(120.9842195);
      expect(result.dutyStatus).toBe('ON_LEAVE');
    });

    it('throws NotFoundException when driver does not exist', async () => {
      driverRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('missing', buildUpdateDto({ name: 'N/A' }), actor),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

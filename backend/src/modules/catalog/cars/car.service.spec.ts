import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { CarService } from './car.service';
import { Car } from './car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';

describe('CarService', () => {
  let service: CarService;
  let carRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    findAndCount: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  const makeCar = (overrides: Partial<Car> = {}) =>
    ({
      id: 'car-1',
      make: 'Toyota',
      model: 'Camry',
      year: 2024,
      plateNumber: 'ABC-1234',
      color: null,
      carType: 'Sedan',
      photoUrl: null,
      isActive: true,
      seatingCapacity: 5,
      vehicleStatus: 'OPERATIONAL',
      registrationExpiry: null,
      insuranceExpiry: null,
      codingDay: 'NONE',
      assignmentPool: 'GENERAL',
      autoAssignEnabled: true,
      allowGeneralUseWhenExecutiveAway: false,
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    }) as Car;

  const buildCreateDto = (payload: Record<string, unknown>): CreateCarDto =>
    payload as unknown as CreateCarDto;

  const buildUpdateDto = (payload: Record<string, unknown>): UpdateCarDto =>
    payload as unknown as UpdateCarDto;

  beforeEach(async () => {
    carRepo = {
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
        CarService,
        { provide: getRepositoryToken(Car), useValue: carRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CarService>(CarService);
  });

  describe('create', () => {
    it('applies canonical defaults instead of hardcoded values', async () => {
      carRepo.create.mockImplementation((input) => ({
        ...input,
        id: 'car-new',
      }));
      carRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreateDto({
          make: 'Toyota',
          model: 'Camry',
          plateNumber: 'ABC-1234',
        }),
        undefined,
        actor,
      );

      expect(result.seatingCapacity).toBe(5);
      expect(result.vehicleStatus).toBe('OPERATIONAL');
      expect(result.codingDay).toBe('NONE');
      expect(result.assignmentPool).toBe('GENERAL');
      expect(result.autoAssignEnabled).toBe(true);
      expect(result.allowGeneralUseWhenExecutiveAway).toBe(false);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE_CAR', targetId: 'car-new' }),
      );
    });

    it('honors explicit payload values', async () => {
      carRepo.create.mockImplementation((input) => ({
        ...input,
        id: 'car-new',
      }));
      carRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        buildCreateDto({
          make: 'Ford',
          model: 'Everest',
          plateNumber: 'XYZ-9876',
          seatingCapacity: 7,
          vehicleStatus: 'MAINTENANCE',
          codingDay: 'WEDNESDAY',
          assignmentPool: 'SPECIAL',
          autoAssignEnabled: false,
          registrationExpiry: '2027-01-31',
          insuranceExpiry: '2027-03-15',
        }),
        undefined,
        actor,
      );

      expect(result.seatingCapacity).toBe(7);
      expect(result.vehicleStatus).toBe('MAINTENANCE');
      expect(result.codingDay).toBe('WEDNESDAY');
      expect(result.assignmentPool).toBe('SPECIAL');
      expect(result.autoAssignEnabled).toBe(false);
      expect(result.registrationExpiry).toBe('2027-01-31');
      expect(result.insuranceExpiry).toBe('2027-03-15');
    });
  });

  describe('update', () => {
    it('applies whitelisted mutable fields', async () => {
      carRepo.findOne.mockResolvedValue(makeCar());
      carRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'car-1',
        buildUpdateDto({
          vehicleStatus: 'MAINTENANCE',
          codingDay: 'FRIDAY',
          assignmentPool: 'EXECUTIVE',
          autoAssignEnabled: false,
          registrationExpiry: '2027-01-31',
        }),
        undefined,
        actor,
      );

      expect(result.vehicleStatus).toBe('MAINTENANCE');
      expect(result.codingDay).toBe('FRIDAY');
      expect(result.assignmentPool).toBe('EXECUTIVE');
      expect(result.autoAssignEnabled).toBe(false);
      expect(result.registrationExpiry).toBe('2027-01-31');
    });

    it('never writes system-owned or non-whitelisted fields', async () => {
      const existing = makeCar({ photoUrl: '/uploads/cars/car-1.jpg' });
      carRepo.findOne.mockResolvedValue(existing);
      carRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'car-1',
        buildUpdateDto({
          photoUrl: '/uploads/cars/hacked.jpg',
          id: 'hacked-id',
          createdAt: new Date('2000-01-01T00:00:00Z'),
          seatingCapacity: 9,
        }),
        undefined,
        actor,
      );

      expect(result.id).toBe('car-1');
      expect(result.photoUrl).toBe('/uploads/cars/car-1.jpg');
      expect(result.createdAt).toEqual(new Date('2026-08-01T00:00:00Z'));
      expect(result.seatingCapacity).toBe(9);
    });

    it('throws NotFoundException when car does not exist', async () => {
      carRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          'missing',
          buildUpdateDto({ make: 'N/A' }),
          undefined,
          actor,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});

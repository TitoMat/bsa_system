import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../../audit/audit.service';
import { Car } from '../../catalog/cars/car.entity';
import { VehicleAvailabilityBlock } from '../entities/vehicle-availability-block.entity';
import { VehicleAvailabilityBlockService } from './vehicle-availability-block.service';

describe('VehicleAvailabilityBlockService', () => {
  let service: VehicleAvailabilityBlockService;
  let blockRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    delete: jest.Mock;
  };
  let carRepo: { findOne: jest.Mock };
  let auditService: { log: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  const makeBlock = (overrides: Partial<VehicleAvailabilityBlock> = {}) =>
    ({
      id: 'blk-1',
      vehicleId: 'car-1',
      startAt: new Date('2026-08-12T00:00:00.000Z'),
      endAt: new Date('2026-08-14T00:00:00.000Z'),
      reason: 'MAINTENANCE',
      notes: null,
      createdByUserId: 'actor-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as VehicleAvailabilityBlock;

  beforeEach(async () => {
    blockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      delete: jest.fn(),
    };
    carRepo = { findOne: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehicleAvailabilityBlockService,
        {
          provide: getRepositoryToken(VehicleAvailabilityBlock),
          useValue: blockRepo,
        },
        { provide: getRepositoryToken(Car), useValue: carRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<VehicleAvailabilityBlockService>(
      VehicleAvailabilityBlockService,
    );
  });

  describe('create', () => {
    it('creates a valid block', async () => {
      carRepo.findOne.mockResolvedValue({ id: 'car-1' });
      blockRepo.create.mockImplementation(
        (input: VehicleAvailabilityBlock) => ({
          ...input,
          id: 'blk-new',
        }),
      );
      blockRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.create(
        {
          vehicleId: 'car-1',
          startAt: '2026-08-12T00:00:00.000Z',
          endAt: '2026-08-14T00:00:00.000Z',
          reason: 'MAINTENANCE',
        },
        actor,
      );

      expect(result.reason).toBe('MAINTENANCE');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE_VEHICLE_AVAILABILITY_BLOCK',
        }),
      );
    });

    it('rejects endAt <= startAt', async () => {
      carRepo.findOne.mockResolvedValue({ id: 'car-1' });

      await expect(
        service.create(
          {
            vehicleId: 'car-1',
            startAt: '2026-08-14T00:00:00.000Z',
            endAt: '2026-08-12T00:00:00.000Z',
            reason: 'MAINTENANCE',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a missing vehicle', async () => {
      carRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          {
            vehicleId: 'missing',
            startAt: '2026-08-12T00:00:00.000Z',
            endAt: '2026-08-14T00:00:00.000Z',
            reason: 'MANUAL_BLOCK',
          },
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update', () => {
    it('re-validates the interval after applying changes', async () => {
      blockRepo.findOne.mockResolvedValue(makeBlock());
      blockRepo.save.mockImplementation((input) => Promise.resolve(input));

      const result = await service.update(
        'blk-1',
        { endAt: '2026-08-20T00:00:00.000Z', reason: 'REPAIR' } as never,
        actor,
      );

      expect(result.reason).toBe('REPAIR');
      expect(result.endAt.toISOString()).toBe('2026-08-20T00:00:00.000Z');
    });

    it('rejects an invalid update interval', async () => {
      blockRepo.findOne.mockResolvedValue(makeBlock());

      await expect(
        service.update(
          'blk-1',
          { startAt: '2026-08-15T00:00:00.000Z' } as never,
          actor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes explicitly and audits', async () => {
      blockRepo.findOne.mockResolvedValue(makeBlock());
      blockRepo.delete.mockResolvedValue({ affected: 1 });

      await service.remove('blk-1', actor);

      expect(blockRepo.delete).toHaveBeenCalledWith({ id: 'blk-1' });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE_VEHICLE_AVAILABILITY_BLOCK',
        }),
      );
    });

    it('throws when the block does not exist', async () => {
      blockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('missing', actor)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});

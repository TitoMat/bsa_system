import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { AuditService } from '../../audit/audit.service';
import { TransportationService } from './transportation.service';
import { TransportationRequest } from './entities/transportation-request.entity';
import { TransportStop } from './entities/transport-stop.entity';
import { TransportPassenger } from './entities/transport-passenger.entity';
import { TransportAssignment } from './entities/transport-assignment.entity';
import { TransportStatusHistory } from './entities/transport-status-history.entity';
import { TransportTripEvent } from './entities/transport-trip-event.entity';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { FleetDispatchService } from '../dispatch/services/fleet-dispatch.service';
import { UpdateTransportationRequestDto } from './dto/update-transportation-request.dto';

describe('TransportationService update safety', () => {
  let service: TransportationService;
  let requestRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  const makeRequest = (overrides: Partial<TransportationRequest> = {}) =>
    ({
      id: 'req-1',
      requestNumber: 'TR-2026-000001',
      requestType: 'OFFICIAL_TRIP',
      title: 'Original title',
      purpose: 'Original purpose',
      priority: 'NORMAL',
      tripType: 'ONE_WAY',
      requestedByUserId: 'user-1',
      status: 'DRAFT',
      scheduledPickupAt: new Date('2026-08-01T08:00:00Z'),
      expectedReturnAt: null,
      approvedAt: null,
      pickupAddress: 'Original pickup',
      destinationAddress: 'Original destination',
      createdAt: new Date('2026-08-01T00:00:00Z'),
      updatedAt: new Date('2026-08-01T00:00:00Z'),
      ...overrides,
    }) as TransportationRequest;

  const buildDto = (
    payload: Record<string, unknown>,
  ): UpdateTransportationRequestDto =>
    payload as unknown as UpdateTransportationRequestDto;

  beforeEach(async () => {
    requestRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
    };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportationService,
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        { provide: getRepositoryToken(TransportStop), useValue: {} },
        { provide: getRepositoryToken(TransportPassenger), useValue: {} },
        { provide: getRepositoryToken(TransportAssignment), useValue: {} },
        { provide: getRepositoryToken(TransportStatusHistory), useValue: {} },
        { provide: getRepositoryToken(TransportTripEvent), useValue: {} },
        { provide: getRepositoryToken(Driver), useValue: {} },
        { provide: getRepositoryToken(Car), useValue: {} },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: {} },
        { provide: ConfigService, useValue: {} },
        {
          provide: FleetDispatchService,
          useValue: {
            requestAutoDispatch: jest.fn().mockResolvedValue({
              ok: false,
              status: 'AUTO_DISPATCH_DISABLED',
              failures: ['auto dispatch is disabled'],
            }),
            dispatchManual: jest.fn().mockResolvedValue({
              ok: false,
              status: 'VALIDATION_FAILED',
              failures: ['not implemented in test'],
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransportationService>(TransportationService);
  });

  beforeEach(() => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    requestRepo.save.mockImplementation(
      async (value: TransportationRequest) => value,
    );
  });

  it('does not allow protected/system fields to be overwritten through the update DTO', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);

    const dto = buildDto({
      title: 'Updated title',
      status: 'COMPLETED',
      requestNumber: 'TR-2026-999999',
      id: 'req-evil',
      requestedByUserId: 'user-evil',
      approvedAt: new Date('2026-08-02T00:00:00Z'),
      createdAt: new Date('1970-01-01T00:00:00Z'),
    });

    await service.update(actor, 'req-1', dto);

    expect(request.title).toBe('Updated title');
    expect(request.status).toBe('DRAFT');
    expect(request.requestNumber).toBe('TR-2026-000001');
    expect(request.id).toBe('req-1');
    expect(request.requestedByUserId).toBe('user-1');
    expect(request.approvedAt).toBeNull();
    expect(request.createdAt).toEqual(new Date('2026-08-01T00:00:00Z'));
  });

  it('updates only mutable fields that were provided', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);

    const dto = buildDto({
      title: 'New title',
      pickupAddress: 'New pickup',
      purpose: undefined,
    });

    await service.update(actor, 'req-1', dto);

    expect(request.title).toBe('New title');
    expect(request.pickupAddress).toBe('New pickup');
    expect(request.purpose).toBe('Original purpose');
    expect(request.destinationAddress).toBe('Original destination');
  });

  it('converts date-string fields to Date instances', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);

    const dto = buildDto({
      scheduledPickupAt: '2026-09-15T10:30:00Z',
      expectedReturnAt: '2026-09-15T18:00:00Z',
    });

    await service.update(actor, 'req-1', dto);

    expect(request.scheduledPickupAt).toBeInstanceOf(Date);
    expect(request.scheduledPickupAt).toEqual(new Date('2026-09-15T10:30:00Z'));
    expect(request.expectedReturnAt).toEqual(new Date('2026-09-15T18:00:00Z'));
  });

  it('keeps the round-trip/multi-stop validation intact', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);

    const dto = buildDto({
      tripType: 'ROUND_TRIP',
      expectedReturnAt: undefined,
    });

    await expect(service.update(actor, 'req-1', dto)).rejects.toThrow(
      'Round trip requires an expected return date',
    );
  });
});

describe('TransportationService submit/approve auto-dispatch wiring', () => {
  let service: TransportationService;
  let requestRepo: { findOne: jest.Mock; save: jest.Mock };
  let historyRepo: { create: jest.Mock; save: jest.Mock };
  let dispatchService: { requestAutoDispatch: jest.Mock };

  const actor = { sub: 'actor-1', email: 'actor@example.com' };

  type HistoryRow = {
    requestId: string;
    previousStatus: string;
    newStatus: string;
    remarks: string;
  };

  const makeRequest = (overrides: Record<string, unknown> = {}) =>
    ({
      id: 'req-1',
      requestNumber: 'TR-2026-000001',
      requestType: 'OFFICIAL_TRIP',
      title: 'Trip',
      status: 'DRAFT',
      scheduledPickupAt: new Date('2026-08-01T08:00:00Z'),
      ...overrides,
    }) as TransportationRequest;

  beforeEach(async () => {
    requestRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation(async (value: unknown) => value),
    };
    historyRepo = {
      create: jest.fn().mockImplementation((row: HistoryRow) => row),
      save: jest.fn().mockImplementation(async (row: HistoryRow) => row),
    };
    dispatchService = { requestAutoDispatch: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportationService,
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        { provide: getRepositoryToken(TransportStop), useValue: {} },
        { provide: getRepositoryToken(TransportPassenger), useValue: {} },
        { provide: getRepositoryToken(TransportAssignment), useValue: {} },
        {
          provide: getRepositoryToken(TransportStatusHistory),
          useValue: historyRepo,
        },
        { provide: getRepositoryToken(TransportTripEvent), useValue: {} },
        { provide: getRepositoryToken(Driver), useValue: {} },
        { provide: getRepositoryToken(Car), useValue: {} },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: DataSource, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: FleetDispatchService, useValue: dispatchService },
      ],
    }).compile();

    service = module.get<TransportationService>(TransportationService);
  });

  it('auto-dispatches after submit and returns the assigned request when the engine assigns a pair', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    dispatchService.requestAutoDispatch.mockImplementation(
      async () => {
        request.status = 'DRIVER_ASSIGNED';
        return { ok: true, status: 'DISPATCHED' };
      },
    );

    const result = await service.submit(actor, 'req-1');

    expect(dispatchService.requestAutoDispatch).toHaveBeenCalledWith(
      actor,
      'req-1',
    );
    expect(result.status).toBe('DRIVER_ASSIGNED');
  });

  it('records the specific dispatch failure reason when auto-assignment fails after submit', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    dispatchService.requestAutoDispatch.mockResolvedValue({
      ok: false,
      status: 'NO_ELIGIBLE_DRIVER',
      failures: [
        'No eligible drivers (all drivers off duty or already booked)',
      ],
    });

    const result = await service.submit(actor, 'req-1');

    expect(result.status).toBe('FOR_DISPATCH');
    const forDispatch = historyRepo.save.mock.calls
      .map(([row]) => row as HistoryRow)
      .find((row) => row.newStatus === 'FOR_DISPATCH');
    expect(forDispatch).toBeDefined();
    expect(forDispatch!.remarks).toContain('No eligible drivers');
  });

  it('leaves the request FOR_DISPATCH when auto dispatch is disabled', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    dispatchService.requestAutoDispatch.mockResolvedValue({
      ok: false,
      status: 'AUTO_DISPATCH_DISABLED',
      failures: ['Auto dispatch is disabled'],
    });

    const result = await service.submit(actor, 'req-1');

    expect(result.status).toBe('FOR_DISPATCH');
    const forDispatch = historyRepo.save.mock.calls
      .map(([row]) => row as HistoryRow)
      .find((row) => row.newStatus === 'FOR_DISPATCH');
    expect(forDispatch!.remarks).toContain('Auto dispatch is disabled');
  });

  it('auto-dispatches after approve and never records a FOR_DISPATCH row on success', async () => {
    const request = makeRequest({ status: 'PENDING_APPROVAL' });
    requestRepo.findOne.mockResolvedValue(request);
    dispatchService.requestAutoDispatch.mockImplementation(
      async () => {
        request.status = 'DRIVER_ASSIGNED';
        return { ok: true, status: 'DISPATCHED' };
      },
    );

    const result = await service.approve(actor, 'req-1');

    expect(result.status).toBe('DRIVER_ASSIGNED');
    const forDispatch = historyRepo.save.mock.calls
      .map(([row]) => row as HistoryRow)
      .find((row) => row.newStatus === 'FOR_DISPATCH');
    expect(forDispatch).toBeUndefined();
  });
});

describe('TransportationService getCalendarEvents', () => {
  let service: TransportationService;
  let qb: {
    leftJoin: jest.Mock;
    select: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getRawMany: jest.Mock;
  };
  let requestRepo: { createQueryBuilder: jest.Mock };

  const makeRow = (overrides: Record<string, unknown> = {}) => ({
    request_id: 'req-1',
    request_number: 'TR-2026-000001',
    title: 'Airport pickup',
    priority: 'NORMAL',
    status: 'DRIVER_ASSIGNED',
    trip_type: 'ONE_WAY',
    passenger_count: 2,
    scheduled_pickup_at: new Date('2026-08-10T08:00:00Z'),
    expected_end_at: new Date('2026-08-10T10:00:00Z'),
    expected_return_at: null,
    pickup_address: 'Home',
    destination_address: 'Airport',
    d_name: 'Juan Dela Cruz',
    v_plate: 'XYZ-123',
    ...overrides,
  });

  beforeEach(async () => {
    qb = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
    };
    requestRepo = { createQueryBuilder: jest.fn().mockReturnValue(qb) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportationService,
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        { provide: getRepositoryToken(TransportStop), useValue: {} },
        { provide: getRepositoryToken(TransportPassenger), useValue: {} },
        { provide: getRepositoryToken(TransportAssignment), useValue: {} },
        { provide: getRepositoryToken(TransportStatusHistory), useValue: {} },
        { provide: getRepositoryToken(TransportTripEvent), useValue: {} },
        { provide: getRepositoryToken(Driver), useValue: {} },
        { provide: getRepositoryToken(Car), useValue: {} },
        {
          provide: AuditService,
          useValue: { log: jest.fn().mockResolvedValue(undefined) },
        },
        { provide: DataSource, useValue: {} },
        { provide: ConfigService, useValue: {} },
        { provide: FleetDispatchService, useValue: {} },
      ],
    }).compile();

    service = module.get<TransportationService>(TransportationService);
  });

  it('returns a lean event list with driver/vehicle names from the ACTIVE assignment', async () => {
    qb.getRawMany.mockResolvedValue([makeRow()]);

    const result = await service.getCalendarEvents(
      '2026-08-01T00:00:00.000Z',
      '2026-08-31T23:59:59.999Z',
    );

    expect(requestRepo.createQueryBuilder).toHaveBeenCalledWith('r');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'r.scheduled_pickup_at >= :from',
      { from: '2026-08-01T00:00:00.000Z' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'r.scheduled_pickup_at <= :to',
      { to: '2026-08-31T23:59:59.999Z' },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('r.scheduled_pickup_at', 'ASC');
    expect(result).toEqual([
      {
        id: 'req-1',
        requestNumber: 'TR-2026-000001',
        title: 'Airport pickup',
        priority: 'NORMAL',
        status: 'DRIVER_ASSIGNED',
        tripType: 'ONE_WAY',
        passengerCount: 2,
        scheduledPickupAt: new Date('2026-08-10T08:00:00Z'),
        expectedEndAt: new Date('2026-08-10T10:00:00Z'),
        expectedReturnAt: null,
        pickupAddress: 'Home',
        destinationAddress: 'Airport',
        driver: 'Juan Dela Cruz',
        vehicle: 'XYZ-123',
      },
    ]);
  });

  it('skips the scheduled range filter when no from/to are provided', async () => {
    qb.getRawMany.mockResolvedValue([]);

    await service.getCalendarEvents();

    expect(qb.andWhere).not.toHaveBeenCalled();
  });
});

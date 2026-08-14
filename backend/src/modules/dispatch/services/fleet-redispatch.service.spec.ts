import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../../../audit/audit.service';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { FleetDispatchService } from './fleet-dispatch.service';
import { FleetRedispatchService } from './fleet-redispatch.service';
import type { FleetAssignmentPool } from '../../catalog/fleet-domain';

const makeRequest = (overrides: Partial<TransportationRequest> = {}) =>
  ({
    id: 'req-1',
    status: 'DRIVER_DECLINED',
    ...overrides,
  }) as TransportationRequest;

const makeAssignment = (overrides: Partial<FleetAssignment> = {}) =>
  ({
    id: 'asgn-1',
    transportationRequestId: 'req-1',
    driverId: 'd-1',
    vehicleId: 'c-1',
    status: 'SUPERSEDED',
    assignmentMethod: 'AUTOMATIC',
    supersedeReason: 'Driver declined',
    ...overrides,
  }) as FleetAssignment;

describe('FleetRedispatchService', () => {
  let service: FleetRedispatchService;
  let fleetRepo: Record<string, jest.Mock>;
  let requestRepo: Record<string, jest.Mock>;
  let dispatchService: Record<string, jest.Mock>;
  let auditService: Record<string, jest.Mock>;

  beforeEach(async () => {
    fleetRepo = { find: jest.fn() };
    requestRepo = { findOne: jest.fn() };
    dispatchService = { dispatchReassign: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetRedispatchService,
        { provide: getRepositoryToken(FleetAssignment), useValue: fleetRepo },
        { provide: getRepositoryToken(TransportationRequest), useValue: requestRepo },
        { provide: FleetDispatchService, useValue: dispatchService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<FleetRedispatchService>(FleetRedispatchService);
  });

  describe('getRedispatchState', () => {
    it('returns redispatch required when driver declined and no active assignment exists', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_DECLINED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ status: 'CANCELLED', assignmentMethod: 'AUTOMATIC' }),
      ]);

      const state = await service.getRedispatchState('req-1');

      expect(state.redispatchRequired).toBe(true);
      expect(state.exceptionCode).toBe('DRIVER_DECLINED');
      expect(state.redispatchAttempts).toBe(1);
    });

    it('does not require redispatch when active assignment exists', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_ACCEPTED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ status: 'ACTIVE' }),
      ]);

      const state = await service.getRedispatchState('req-1');

      expect(state.redispatchRequired).toBe(false);
    });

    it('returns ACTIVE_TRIP_RESOURCE_UNAVAILABLE for active trip without assignment', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'IN_TRANSIT' }));
      fleetRepo.find.mockResolvedValue([]);

      const state = await service.getRedispatchState('req-1');

      expect(state.redispatchRequired).toBe(true);
      expect(state.exceptionCode).toBe('ACTIVE_TRIP_RESOURCE_UNAVAILABLE');
    });

    it('counts multiple redispatch attempts from history', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_DECLINED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ id: 'a2', status: 'SUPERSEDED', assignmentMethod: 'REASSIGNMENT' }),
        makeAssignment({ id: 'a1', status: 'CANCELLED', assignmentMethod: 'AUTOMATIC' }),
      ]);

      const state = await service.getRedispatchState('req-1');

      expect(state.redispatchAttempts).toBe(2);
    });

    it('returns 0 attempts for a fresh request', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'APPROVED' }));
      fleetRepo.find.mockResolvedValue([]);

      const state = await service.getRedispatchState('req-1');

      expect(state.redispatchRequired).toBe(false);
      expect(state.redispatchAttempts).toBe(0);
      expect(state.exceptionCode).toBeNull();
    });
  });

  describe('requestRedispatch', () => {
    it('blocks redispatch during ACTIVE_TRIP', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'IN_TRANSIT' }));

      const result = await service.requestRedispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('BLOCKED');
    });

    it('blocks redispatch when max attempts exceeded', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_DECLINED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ id: 'a3', status: 'SUPERSEDED', assignmentMethod: 'REASSIGNMENT' }),
        makeAssignment({ id: 'a2', status: 'SUPERSEDED', assignmentMethod: 'AUTOMATIC' }),
        makeAssignment({ id: 'a1', status: 'CANCELLED', assignmentMethod: 'AUTOMATIC' }),
      ]);

      const result = await service.requestRedispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('REDISPATCH_FAILED');
    });

    it('delegates to FleetDispatchService for pre-trip redispatch', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_DECLINED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ status: 'CANCELLED', assignmentMethod: 'AUTOMATIC' }),
      ]);
      dispatchService.dispatchReassign.mockResolvedValue({
        ok: true,
        status: 'ASSIGNED',
        assignment: { id: 'new-asgn', driverId: 'd-2', vehicleId: 'c-2' },
      });

      const result = await service.requestRedispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(true);
      expect(result.status).toBe('REDISPATCHED');
      expect(dispatchService.dispatchReassign).toHaveBeenCalledWith(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
        'Operational redispatch',
      );
    });

    it('reports when dispatchReassign fails', async () => {
      requestRepo.findOne.mockResolvedValue(makeRequest({ status: 'DRIVER_DECLINED' }));
      fleetRepo.find.mockResolvedValue([
        makeAssignment({ status: 'CANCELLED', assignmentMethod: 'AUTOMATIC' }),
      ]);
      dispatchService.dispatchReassign.mockResolvedValue({
        ok: false,
        status: 'NO_ELIGIBLE_DRIVER',
        failures: ['No eligible drivers'],
      });

      const result = await service.requestRedispatch(
        { sub: 'u-1', email: 'a@b.com' },
        'req-1',
      );

      expect(result.ok).toBe(false);
      expect(result.status).toBe('REDISPATCH_FAILED');
      expect(result.reason).toContain('No eligible drivers');
    });
  });
});

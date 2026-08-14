import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../../audit/audit.service';
import { FleetDispatchService } from './fleet-dispatch.service';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { classifyTripPhase, isActiveTrip, isPreTrip } from '../utils/tripClassifier';
import type { ExceptionCode } from '../utils/operationalException';

type RedispatchState = {
  redispatchRequired: boolean;
  redispatchAttempts: number;
  previousAssignment: {
    driverId: string;
    vehicleId: string;
    method: string;
    status: string;
  } | null;
  exceptionCode: ExceptionCode | null;
};

/**
 * R5B — Fleet Redispatch Orchestration.
 *
 * Thin coordination layer. All assignment decisions flow through
 * FleetDispatchService (R4). This service only:
 *  - classifies trip phase to gate automatic redispatch
 *  - counts prior attempts from fleet_assignments history
 *  - delegates to FleetDispatchService.dispatchReassign
 *  - audits the result
 *
 * No Driver/Vehicle selection. No pool policy. No random logic.
 */
@Injectable()
export class FleetRedispatchService {
  private readonly logger = new Logger(FleetRedispatchService.name);
  private readonly maxAutoAttempts = 2;

  constructor(
    @InjectRepository(FleetAssignment)
    private readonly fleetRepo: Repository<FleetAssignment>,
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    private readonly dispatchService: FleetDispatchService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Derive the current redispatch state for a request from existing data.
   * No writes. Pure read-model.
   */
  async getRedispatchState(requestId: string): Promise<RedispatchState> {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      return { redispatchRequired: false, redispatchAttempts: 0, previousAssignment: null, exceptionCode: null };
    }

    const phase = classifyTripPhase(request.status);
    const assignments = await this.fleetRepo.find({
      where: { transportationRequestId: requestId },
      order: { createdAt: 'DESC' },
    });

    const active = assignments.find((a) => a.status === 'ACTIVE');
    const previous = assignments.find((a) =>
      ['SUPERSEDED', 'CANCELLED'].includes(a.status),
    );

    // Count prior redispatch attempts (SUPERSEDED or CANCELLED from AUTOMATIC/REASSIGNMENT)
    const attemptCount = assignments.filter(
      (a) =>
        ['SUPERSEDED', 'CANCELLED'].includes(a.status) &&
        (a.assignmentMethod === 'AUTOMATIC' || a.assignmentMethod === 'REASSIGNMENT'),
    ).length;

    let redispatchRequired = false;
    let exceptionCode: ExceptionCode | null = null;

    if (isActiveTrip(request.status)) {
      // Active trip — never auto-redispatch. Resource issue is CRITICAL manual intervention.
      if (!active) {
        redispatchRequired = true;
        exceptionCode = 'ACTIVE_TRIP_RESOURCE_UNAVAILABLE';
      }
    } else if (isPreTrip(request.status)) {
      // Pre-trip — redispatch if no active assignment but had one previously
      if (!active && previous) {
        redispatchRequired = true;
        const last = assignments[0];
        if (previous.status === 'CANCELLED') {
          exceptionCode = 'DRIVER_DECLINED';
        } else {
          exceptionCode = 'REDISPATCH_REQUIRED';
        }
      }
    }

    return {
      redispatchRequired,
      redispatchAttempts: attemptCount,
      previousAssignment: previous
        ? { driverId: previous.driverId, vehicleId: previous.vehicleId, method: previous.assignmentMethod, status: previous.status }
        : null,
      exceptionCode,
    };
  }

  /**
   * Attempt redispatch. Gates: PRE_TRIP only, attempt limit not exceeded,
   * FleetDispatchService decides the pair.
   */
  async requestRedispatch(
    actor: { sub: string; email: string },
    requestId: string,
    reason?: string,
  ) {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) throw new Error('Request not found');

    if (isActiveTrip(request.status)) {
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'FLEET_REDISPATCH_BLOCKED',
        targetId: requestId,
        targetType: 'transportation_request',
        metadata: { reason: 'ACTIVE_TRIP — automatic redispatch prohibited', phase: 'ACTIVE_TRIP' },
      });
      return { ok: false, status: 'BLOCKED', reason: 'Active trip — manual intervention required' };
    }

    const state = await this.getRedispatchState(requestId);
    if (state.redispatchAttempts >= this.maxAutoAttempts) {
      return { ok: false, status: 'REDISPATCH_FAILED', reason: `Redispatch limit of ${this.maxAutoAttempts} attempts exceeded` };
    }

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'FLEET_REDISPATCH_STARTED',
      targetId: requestId,
      targetType: 'transportation_request',
      metadata: { attemptNumber: state.redispatchAttempts + 1, reason: reason ?? 'Operational redispatch' },
    });

    const decision = await this.dispatchService.dispatchReassign(
      actor,
      requestId,
      reason ?? 'Operational redispatch',
    );

    if (decision.ok) {
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'FLEET_REDISPATCH_SUCCEEDED',
        targetId: decision.assignment.id,
        targetType: 'fleet_assignment',
        metadata: { requestId, attemptNumber: state.redispatchAttempts + 1, newAssignmentId: decision.assignment.id },
      });
      return { ok: true, status: 'REDISPATCHED', assignment: decision.assignment };
    }

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'FLEET_REDISPATCH_FAILED',
      targetId: requestId,
      targetType: 'transportation_request',
      metadata: { attemptNumber: state.redispatchAttempts + 1, result: decision.status, failures: decision.failures },
    });
    return {
      ok: false,
      status: 'REDISPATCH_FAILED',
      reason: decision.failures?.join('; ') ?? decision.status,
      attemptNumber: state.redispatchAttempts + 1,
    };
  }
}

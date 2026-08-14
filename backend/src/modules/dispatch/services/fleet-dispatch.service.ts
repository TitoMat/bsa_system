import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { AuditService } from '../../../audit/audit.service';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../../transportation/entities/transport-assignment.entity';
import { TransportStatusHistory } from '../../transportation/entities/transport-status-history.entity';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { FleetAvailabilityService } from '../../scheduling/services/fleet-availability.service';
import type { AvailabilityResult } from '../../scheduling/domain/scheduling-domain';
import type {
  DriverAvailabilityReason,
  VehicleAvailabilityReason,
} from '../../scheduling/domain/scheduling-domain';
import { deriveServiceWindow } from '../../scheduling/domain/service-window';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { FleetDispatchSettings } from '../entities/fleet-dispatch-settings.entity';
import type {
  AssignmentMethod,
  AssignmentRef,
  AssignmentStrategy,
  DispatchDecision,
  DispatchFailCode,
  DispatchResultStatus,
} from '../domain/dispatch-domain';
import {
  isOverrideableFailCode,
  isResourceAllowedByPool,
} from '../domain/dispatch-domain';
import type { AssignmentRandomSource } from './assignment-random.source';
import { ASSIGNMENT_RANDOM_SOURCE } from '../dispatch.constants';

const TERMINAL_REQUEST_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'NO_SHOW',
];

const DISPATCHABLE_STATUSES = [
  'APPROVED',
  'FOR_DISPATCH',
  'DRIVER_ASSIGNED',
  'DRIVER_DECLINED',
  'REASSIGNMENT_REQUIRED',
];

const LEGACY_CONSUMING_STATUSES = ['OFFERED', 'ACCEPTED'];

const WORKLOAD_LOOKBACK_DAYS = 30;
const WORKLOAD_CAP_DRIVER = 8;
const WORKLOAD_CAP_VEHICLE = 10;

type WorkloadSet = {
  drivers: Map<string, number>;
  vehicles: Map<string, number>;
};

/**
 * R4 — Canonical fleet assignment engine.
 *
 * Single writer for "who drives what, when". Every path that changes an
 * assignment (auto, manual, override, reassignment, terminal sync, driver
 * accept/decline) goes through this service. Nothing else may write
 * assignment state.
 *
 * Invariants (see also fleet_assignments migration):
 *  - one ACTIVE fleet_assignment per request (partial unique index)
 *  - no overlapping ACTIVE assignments per driver or per vehicle (enforced
 *    inside the transaction AFTER row locks, then by the index on request)
 *  - the request row is always locked first (lock order request → driver →
 *    vehicle) so concurrent dispatches cannot deadlock and cannot double-book
 *  - all randomness flows through AssignmentRandomSource (crypto in prod)
 *  - failures NEVER destroy the request (only REASSIGNMENT mutates the
 *    previous assignment, and only to SUPERSEDED)
 */
@Injectable()
export class FleetDispatchService {
  private readonly logger = new Logger(FleetDispatchService.name);
  private readonly maxAttempts = 4;

  constructor(
    @InjectRepository(FleetAssignment)
    private readonly fleetRepo: Repository<FleetAssignment>,
    @InjectRepository(FleetDispatchSettings)
    private readonly settingsRepo: Repository<FleetDispatchSettings>,
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    @InjectRepository(TransportAssignment)
    private readonly assignmentRepo: Repository<TransportAssignment>,
    @InjectRepository(TransportStatusHistory)
    private readonly historyRepo: Repository<TransportStatusHistory>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    private readonly availabilityService: FleetAvailabilityService,
    @Inject(ASSIGNMENT_RANDOM_SOURCE)
    private readonly randomSource: AssignmentRandomSource,
    private readonly auditService: AuditService,
    private readonly dataSource: DataSource,
  ) {}

  // ─── Public dispatch entry points ─────────────────────────────────────────

  /**
   * Explicit dispatcher-triggered auto dispatch. Bypasses the
   * autoDispatchEnabled gate (an operator pressed the button).
   */
  async dispatchAuto(
    actor: { sub: string; email: string },
    requestId: string,
  ): Promise<DispatchDecision> {
    return this.runEngine(actor, requestId, {
      method: 'AUTOMATIC',
      force: true,
    });
  }

  /**
   * System-triggered auto dispatch (submit / approve / decline-redispatch).
   * Respects the autoDispatchEnabled gate.
   */
  async requestAutoDispatch(
    actor: { sub: string; email: string },
    requestId: string,
  ): Promise<DispatchDecision> {
    return this.runEngine(actor, requestId, {
      method: 'AUTOMATIC',
      force: false,
    });
  }

  /**
   * Dispatcher-picked pair. Bypasses the three overrideable gates
   * (AUTO_ASSIGN_DISABLED, pool policy, executive reservation) but never the
   * safety rules.
   */
  async dispatchManual(
    actor: { sub: string; email: string },
    requestId: string,
    params: {
      driverId: string;
      vehicleId: string;
      dispatchNotes?: string;
      expectedDepartureAt?: Date;
    },
  ): Promise<DispatchDecision> {
    return this.runEngine(actor, requestId, {
      method: 'MANUAL',
      strategy: 'MANUAL',
      force: true,
      fixedDriverId: params.driverId,
      fixedVehicleId: params.vehicleId,
      dispatchNotes: params.dispatchNotes ?? null,
      expectedDepartureAt: params.expectedDepartureAt ?? null,
    });
  }

  /**
   * Manual override with a reason. Same safety envelope as MANUAL; the
   * override reason is persisted for auditability.
   */
  async dispatchOverride(
    actor: { sub: string; email: string },
    requestId: string,
    params: {
      driverId: string;
      vehicleId: string;
      overrideReason: string;
      assignmentStrategy?: AssignmentStrategy;
    },
  ): Promise<DispatchDecision> {
    return this.runEngine(actor, requestId, {
      method: 'OVERRIDE',
      strategy: params.assignmentStrategy ?? 'MANUAL',
      force: true,
      fixedDriverId: params.driverId,
      fixedVehicleId: params.vehicleId,
      overrideReason: params.overrideReason,
    });
  }

  /**
   * Reassignment: supersede the current ACTIVE assignment (reason recorded)
   * and auto-pick a fresh pair with the default strategy. Dispatcher-explicit
   * → gate bypassed.
   */
  async dispatchReassign(
    actor: { sub: string; email: string },
    requestId: string,
    reason?: string,
  ): Promise<DispatchDecision> {
    return this.runEngine(actor, requestId, {
      method: 'REASSIGNMENT',
      force: true,
      supersedeReason: reason ?? 'Manual reassignment request',
    });
  }

  /**
   * Driver accepts the ACTIVE fleet assignment (request → DRIVER_ACCEPTED).
   * The legacy transport_assignment row (pre-R4) is mirrored to ACCEPTED so
   * the dual-check read path stays consistent.
   */
  async acceptAssignment(
    actor: { sub: string; email: string },
    requestId: string,
    fleetAssignmentId: string,
  ) {
    return this.respondToAssignment(actor, requestId, fleetAssignmentId, true);
  }

  /**
   * Driver declines: fleet assignment → CANCELLED, projection cleared,
   * request → DRIVER_DECLINED, then (settings-gated) ONE bounded auto
   * redispatch attempt.
   */
  async declineAssignment(
    actor: { sub: string; email: string },
    requestId: string,
    fleetAssignmentId: string,
    reason: string,
  ) {
    if (!reason) {
      throw new BadRequestException('Decline reason is required');
    }
    const result = await this.respondToAssignment(
      actor,
      requestId,
      fleetAssignmentId,
      false,
      reason,
    );
    if (result.declined) {
      const settings = await this.readSettings();
      if (settings.autoDispatchEnabled) {
        await this.requestAutoDispatch(actor, requestId).catch((err) => {
          this.logger.warn(
            `Auto-redispatch after decline failed for ${requestId}: ${String(err)}`,
          );
        });
      }
    }
    return result;
  }

  /**
   * Terminal sync: a request reaching a terminal status releases the fleet
   * resources it holds. COMPLETED → assignment COMPLETED; any other terminal
   * → CANCELLED. Projection cleared in the same transaction.
   */
  async synchronizeTerminal(
    actor: { sub: string; email: string },
    requestId: string,
    terminalStatus: 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'NO_SHOW',
    remarks?: string,
  ) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const manager = queryRunner.manager;
      const request = await manager.findOne(TransportationRequest, {
        where: { id: requestId },
      });
      if (!request) throw new NotFoundException('Request not found');

      const active = await manager.find(FleetAssignment, {
        where: { transportationRequestId: requestId, status: 'ACTIVE' },
      });
      const nextStatus =
        terminalStatus === 'COMPLETED' ? 'COMPLETED' : 'CANCELLED';
      for (const assignment of active) {
        assignment.status = nextStatus;
        if (terminalStatus === 'COMPLETED') {
          // Release happened because the trip finished.
        }
        await manager.save(assignment);
        await this.auditService.log(
          {
            actorId: actor.sub,
            actorEmail: actor.email,
            action:
              nextStatus === 'COMPLETED'
                ? 'FLEET_ASSIGNMENT_COMPLETED'
                : 'FLEET_ASSIGNMENT_CANCELLED',
            targetId: assignment.id,
            targetType: 'fleet_assignment',
            metadata: {
              requestId,
              driverId: assignment.driverId,
              vehicleId: assignment.vehicleId,
              terminalStatus,
              remarks: remarks ?? null,
            },
          },
          manager,
        );
      }

      const legacy = await manager.find(TransportAssignment, {
        where: [
          { requestId, status: 'OFFERED' },
          { requestId, status: 'ACCEPTED' },
        ],
      });
      for (const assignment of legacy) {
        assignment.status = 'CANCELLED';
        await manager.save(assignment);
      }

      if (active.length > 0 || legacy.length > 0) {
        request.assignedDriverId = null;
        request.assignedVehicleId = null;
        await manager.save(request);
      }

      await queryRunner.commitTransaction();
      return { requestId, released: active.length + legacy.length };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Read models ──────────────────────────────────────────────────────────

  async getFleetAssignments(requestId: string) {
    await this.findRequest(requestId);
    return this.fleetRepo.find({
      where: { transportationRequestId: requestId },
      relations: ['driver', 'vehicle'],
      order: { createdAt: 'DESC' },
    });
  }

  async getExecutiveResourcesSummary() {
    const settings = await this.readSettings();

    const [executiveDrivers, executiveVehicles] = await Promise.all([
      this.driverRepo.find({
        where: { isActive: true, assignmentPool: 'EXECUTIVE' },
      }),
      this.carRepo.find({
        where: { isActive: true, assignmentPool: 'EXECUTIVE' },
      }),
    ]);

    const eligibleDrivers = executiveDrivers.filter(
      (d) =>
        d.autoAssignEnabled &&
        d.dutyStatus !== 'SUSPENDED' &&
        d.dutyStatus !== 'ON_LEAVE',
    );
    const availableVehicles = executiveVehicles.filter(
      (v) => v.autoAssignEnabled && v.vehicleStatus === 'OPERATIONAL',
    );

    const driverIds = executiveDrivers.map((d) => d.id);
    const vehicleIds = executiveVehicles.map((v) => v.id);

    let activeRequests = 0;
    if (driverIds.length > 0 || vehicleIds.length > 0) {
      const activeRows = await this.fleetRepo
        .createQueryBuilder('fa')
        .select('DISTINCT fa.transportationRequestId', 'requestId')
        .where('fa.status = :status', { status: 'ACTIVE' })
        .andWhere(
          new Brackets((qb) => {
            if (driverIds.length > 0) {
              qb.orWhere('fa.driverId IN (:...driverIds)', { driverIds });
            }
            if (vehicleIds.length > 0) {
              qb.orWhere('fa.vehicleId IN (:...vehicleIds)', { vehicleIds });
            }
          }),
        )
        .getRawMany<{ requestId: string }>();
      activeRequests = activeRows.length;
    }

    return {
      executiveReservationMode: settings.executiveReservationMode,
      autoDispatchEnabled: settings.autoDispatchEnabled,
      executiveDrivers: {
        total: executiveDrivers.length,
        eligible: eligibleDrivers.length,
      },
      executiveVehicles: {
        total: executiveVehicles.length,
        available: availableVehicles.length,
      },
      activeExecutiveRequests: activeRequests,
    };
  }

  // ─── Engine ───────────────────────────────────────────────────────────────

  private async runEngine(
    actor: { sub: string; email: string },
    requestId: string,
    params: {
      method: AssignmentMethod;
      strategy?: AssignmentStrategy;
      force?: boolean;
      fixedDriverId?: string;
      fixedVehicleId?: string;
      overrideReason?: string;
      supersedeReason?: string;
      dispatchNotes?: string | null;
      expectedDepartureAt?: Date | null;
    },
  ): Promise<DispatchDecision> {
    const settings = await this.readSettings();
    const strategy = params.strategy ?? settings.defaultAssignmentStrategy;

    const settingsGated =
      (params.method === 'AUTOMATIC' || params.method === 'REASSIGNMENT') &&
      !params.force;
    if (settingsGated && !settings.autoDispatchEnabled) {
      return this.failure(
        'AUTO_DISPATCH_DISABLED',
        ['AUTO_DISPATCH_DISABLED'],
        0,
        'AUTO_ASSIGN_DISABLED',
      );
    }

    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');

    const window = deriveServiceWindow(request);
    if (!window.complete) {
      return this.failure(
        'VALIDATION_FAILED',
        [
          'INVALID_SERVICE_WINDOW: request has no canonical service end (expectedEndAt / expectedReturnAt)',
        ],
        0,
        'INVALID_SERVICE_WINDOW',
      );
    }

    if (!DISPATCHABLE_STATUSES.includes(request.status)) {
      return this.failure(
        'REQUEST_NOT_DISPATCHABLE',
        [`Request is in ${request.status} status`],
        0,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const manager = queryRunner.manager;

      // Lock order #1: the request row.
      const lockedRequest = await manager.findOne(TransportationRequest, {
        where: { id: requestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedRequest) throw new NotFoundException('Request not found');

      if (!DISPATCHABLE_STATUSES.includes(lockedRequest.status)) {
        await queryRunner.rollbackTransaction();
        return this.failure(
          'REQUEST_NOT_DISPATCHABLE',
          [`Request is in ${lockedRequest.status} status`],
          0,
        );
      }

      const existingFleet = await manager.findOne(FleetAssignment, {
        where: {
          transportationRequestId: requestId,
          status: 'ACTIVE',
        },
      });
      const existingLegacy = await manager.findOne(TransportAssignment, {
        where: [
          { requestId, status: 'OFFERED' },
          { requestId, status: 'ACCEPTED' },
        ],
      });

      if (params.method === 'REASSIGNMENT') {
        await this.supersedeExisting(manager, requestId, actor.sub, {
          reason: params.supersedeReason ?? 'Reassigned',
        });
      } else if (existingFleet || existingLegacy) {
        await queryRunner.rollbackTransaction();
        const ref = existingFleet
          ? this.toRef(existingFleet)
          : {
              id: existingLegacy?.id ?? '',
              requestId,
              driverId: existingLegacy?.driverId ?? '',
              vehicleId: existingLegacy?.vehicleId ?? '',
              serviceStartAt: window.serviceStartAt.toISOString(),
              serviceEndAt: window.serviceEndAt.toISOString(),
              assignmentMethod: 'MANUAL' as const,
              assignmentStrategy: 'MANUAL' as const,
              status: 'ACTIVE' as const,
              assignedAt: existingLegacy?.assignedAt.toISOString() ?? '',
            };
        return {
          ok: false,
          status: 'ALREADY_ASSIGNED',
          failCode: null,
          failures: [
            'ALREADY_ASSIGNED: request already has an active assignment',
          ],
          canOverride: false,
          attempts: 0,
          assignment: ref,
        };
      }

      // Candidate construction (advisory layer — exact fields re-validated on
      // the locked rows inside the attempt loop).
      const [drivers, cars] = await Promise.all([
        manager.find(Driver, { where: { isActive: true } }),
        manager.find(Car, { where: { isActive: true } }),
      ]);

      const [driverAvailability, vehicleAvailability, workloads] =
        await Promise.all([
          this.availabilityService.checkDrivers(
            drivers,
            window.serviceStartAt,
            window.serviceEndAt,
          ),
          this.availabilityService.checkVehicles(
            cars,
            window.serviceStartAt,
            window.serviceEndAt,
            lockedRequest.passengerCount,
          ),
          this.loadWorkloads(
            drivers.map((d) => d.id),
            cars.map((c) => c.id),
          ),
        ]);

      const isFixedPair =
        params.fixedDriverId !== undefined ||
        params.fixedVehicleId !== undefined;

      let fixedPairFailures: string[] = [];
      let fixedPairFailCode: DispatchFailCode | null = null;
      if (isFixedPair) {
        const fixed = this.evaluateFixedPair(
          drivers,
          cars,
          driverAvailability,
          vehicleAvailability,
          params.fixedDriverId!,
          params.fixedVehicleId!,
        );
        if (!fixed.ok) {
          fixedPairFailures = fixed.failures;
          fixedPairFailCode = fixed.failCode;
        }
      }

      let attempts = 0;
      let lastConflict: DispatchFailCode = 'ACTIVE_FLEET_ASSIGNMENT_CONFLICT';

      while (attempts < this.maxAttempts) {
        attempts += 1;

        const driverCandidates = drivers.filter((d) =>
          this.isAutoCandidateDriver(
            d,
            driverAvailability.get(d.id),
            lockedRequest,
            settings,
            params.method,
          ),
        );
        const vehicleCandidates = cars.filter((c) =>
          this.isAutoCandidateVehicle(
            c,
            vehicleAvailability.get(c.id),
            lockedRequest,
            settings,
            params.method,
          ),
        );

        if (isFixedPair) {
          if (fixedPairFailures.length > 0) {
            return this.failure(
              'VALIDATION_FAILED',
              fixedPairFailures,
              attempts,
              fixedPairFailCode,
            );
          }
          const outcome = await this.tryWritePair(
            manager,
            actor,
            lockedRequest,
            window.serviceStartAt,
            window.serviceEndAt,
            params,
            strategy,
            settings,
            workloads,
            params.fixedDriverId!,
            params.fixedVehicleId!,
            [],
            [],
          );
          if (outcome.ok) return outcome.decision;
          lastConflict = outcome.code;
          return this.failure(
            'CONFLICT_RETRY_EXHAUSTED',
            [
              `${outcome.code}: resource conflict cannot be bypassed for a fixed pair`,
            ],
            attempts,
            outcome.code,
          );
        }

        if (driverCandidates.length === 0 || vehicleCandidates.length === 0) {
          const driverFail = this.candidateFailure(
            drivers,
            driverAvailability,
            lockedRequest,
            settings,
            params.method,
            'driver',
          );
          const vehicleFail = this.candidateFailure(
            cars,
            vehicleAvailability,
            lockedRequest,
            settings,
            params.method,
            'vehicle',
            window.serviceStartAt,
          );
          const fail = driverCandidates.length === 0 ? driverFail : vehicleFail;
          return this.failure(
            fail.status,
            fail.failures,
            attempts,
            fail.failCode,
          );
        }

        const driverShortlist = this.buildShortlist(
          driverCandidates,
          workloads.drivers,
          strategy,
          (d) => d.id,
        );
        const vehicleShortlist = this.buildShortlist(
          vehicleCandidates,
          workloads.vehicles,
          strategy,
          (v) => v.id,
        );

        const driver =
          driverShortlist[this.randomSource.pickIndex(driverShortlist.length)];
        const vehicle =
          vehicleShortlist[
            this.randomSource.pickIndex(vehicleShortlist.length)
          ];

        const outcome = await this.tryWritePair(
          manager,
          actor,
          lockedRequest,
          window.serviceStartAt,
          window.serviceEndAt,
          params,
          strategy,
          settings,
          workloads,
          driver.id,
          vehicle.id,
          driverCandidates,
          vehicleCandidates,
        );
        if (outcome.ok) {
          await queryRunner.commitTransaction();
          return outcome.decision;
        }
        lastConflict = outcome.code;
      }

      await queryRunner.rollbackTransaction();
      return this.failure(
        'CONFLICT_RETRY_EXHAUSTED',
        [`${lastConflict}: all ${this.maxAttempts} attempts conflicted`],
        attempts,
        lastConflict,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Attempt mechanics ────────────────────────────────────────────────────

  /**
   * One write attempt for a candidate pair. Locks the driver and vehicle rows
   * (lock order: request already held → driver → vehicle), re-validates the
   * locked state, then runs the authoritative in-transaction conflict checks.
   */
  private async tryWritePair(
    manager: DataSource['manager'],
    actor: { sub: string; email: string },
    request: TransportationRequest,
    serviceStartAt: Date,
    serviceEndAt: Date,
    params: {
      method: AssignmentMethod;
      strategy?: AssignmentStrategy;
      overrideReason?: string;
      dispatchNotes?: string | null;
      expectedDepartureAt?: Date | null;
    },
    strategy: AssignmentStrategy,
    settings: FleetDispatchSettings,
    workloads: WorkloadSet,
    driverId: string,
    vehicleId: string,
    driverCandidates: Driver[],
    vehicleCandidates: Car[],
  ): Promise<
    | { ok: true; decision: DispatchDecision }
    | { ok: false; code: DispatchFailCode }
  > {
    const driver = await manager.findOne(Driver, {
      where: { id: driverId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!driver) {
      return { ok: false, code: 'DRIVER_NOT_FOUND' };
    }
    const vehicle = await manager.findOne(Car, {
      where: { id: vehicleId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!vehicle) {
      return { ok: false, code: 'VEHICLE_NOT_FOUND' };
    }

    const lockedDriverOk =
      driver.isActive &&
      driver.dutyStatus !== 'SUSPENDED' &&
      driver.dutyStatus !== 'ON_LEAVE' &&
      driver.dutyStatus !== 'ON_BREAK';
    const lockedVehicleOk =
      vehicle.isActive &&
      vehicle.vehicleStatus === 'OPERATIONAL' &&
      vehicle.seatingCapacity >= request.passengerCount;
    if (!lockedDriverOk || !lockedVehicleOk) {
      return {
        ok: false,
        code: !lockedDriverOk ? 'DRIVER_UNAVAILABLE' : 'VEHICLE_INACTIVE',
      };
    }

    // Pool policy: enforced for AUTO and REASSIGNMENT; bypassed for MANUAL
    // and OVERRIDE (the three overrideable codes in the matrix).
    if (
      params.method === 'AUTOMATIC' ||
      params.method === 'REASSIGNMENT'
    ) {
      const poolOk = isResourceAllowedByPool({
        resourcePool: driver.assignmentPool,
        requestedPool: request.requestedAssignmentPool,
        executiveReservationMode: settings.executiveReservationMode,
        allowGeneralUseWhenExecutiveAway:
          driver.allowGeneralUseWhenExecutiveAway,
      });
      const vehiclePoolOk = isResourceAllowedByPool({
        resourcePool: vehicle.assignmentPool,
        requestedPool: request.requestedAssignmentPool,
        executiveReservationMode: settings.executiveReservationMode,
        allowGeneralUseWhenExecutiveAway:
          vehicle.allowGeneralUseWhenExecutiveAway,
      });
      if (!poolOk || !vehiclePoolOk) {
        return { ok: false, code: 'EXECUTIVE_RESERVATION_POLICY' };
      }
    }

    // Authoritative conflict checks — run AFTER both rows are locked so the
    // reading transaction observes any assignment committed by a concurrent
    // dispatch that also locked (and thus serialized against) this resource.
    const fleetConflict = await manager
      .createQueryBuilder(FleetAssignment, 'fa')
      .where('fa.status = :status', { status: 'ACTIVE' })
      .andWhere('fa.transportationRequestId != :requestId', {
        requestId: request.id,
      })
      .andWhere('(fa.driverId = :driverId OR fa.vehicleId = :vehicleId)', {
        driverId,
        vehicleId,
      })
      .andWhere('fa.serviceStartAt < :endAt', { endAt: serviceEndAt })
      .andWhere('fa.serviceEndAt > :startAt', { startAt: serviceStartAt })
      .getOne();

    if (fleetConflict) {
      return { ok: false, code: 'ACTIVE_FLEET_ASSIGNMENT_CONFLICT' };
    }

    const legacyConflict = await manager
      .createQueryBuilder(TransportAssignment, 'a')
      .innerJoin(
        'transportation_requests',
        'r',
        'r.id = a.requestId AND r.status NOT IN (:...terminalStatuses)',
        { terminalStatuses: TERMINAL_REQUEST_STATUSES },
      )
      .where('a.status IN (:...consuming)', {
        consuming: LEGACY_CONSUMING_STATUSES,
      })
      .andWhere('a.requestId != :requestId', { requestId: request.id })
      .andWhere('(a.driverId = :driverId OR a.vehicleId = :vehicleId)', {
        driverId,
        vehicleId,
      })
      .andWhere('r.scheduledPickupAt < :endAt', { endAt: serviceEndAt })
      .andWhere(`COALESCE(r.expectedEndAt, r.expectedReturnAt) > :startAt`, {
        startAt: serviceStartAt,
      })
      .getRawOne();

    if (legacyConflict) {
      return { ok: false, code: 'EXISTING_REQUEST_CONFLICT' };
    }

    const now = new Date();
    const decisionMetadata =
      params.method === 'AUTOMATIC' || params.method === 'REASSIGNMENT'
        ? {
            strategy,
            eligibleDriverCount: driverCandidates.length,
            eligibleVehicleCount: vehicleCandidates.length,
            selectedDriverRecentWorkload: workloads.drivers.get(driverId) ?? 0,
            selectedVehicleRecentWorkload:
              workloads.vehicles.get(vehicleId) ?? 0,
            selectedDriverDiagnosticScore: this.workloadComponentScore(
              workloads.drivers.get(driverId) ?? 0,
              WORKLOAD_CAP_DRIVER,
              75,
            ),
            selectedVehicleDiagnosticScore: this.workloadComponentScore(
              workloads.vehicles.get(vehicleId) ?? 0,
              WORKLOAD_CAP_VEHICLE,
              40,
            ),
            requestedAssignmentPool: request.requestedAssignmentPool,
            executiveReservationMode: settings.executiveReservationMode,
            routeDistanceMeters: request.estimatedDistanceMeters,
            routeDurationSeconds: request.estimatedDurationSeconds,
          }
        : null;

    const assignment = this.fleetRepo.create({
      transportationRequestId: request.id,
      driverId,
      vehicleId,
      serviceStartAt,
      serviceEndAt,
      assignmentMethod: params.method,
      assignmentStrategy: strategy,
      status: 'ACTIVE',
      assignedAt: now,
      assignedByUserId: actor.sub,
      overrideReason: params.overrideReason ?? null,
      decisionMetadata,
      dispatchNotes: params.dispatchNotes ?? null,
      expectedDepartureAt: params.expectedDepartureAt ?? null,
    });
    const saved = await manager.save(assignment);

    const previousStatus = request.status;
    request.status = 'DRIVER_ASSIGNED';
    request.assignedDriverId = driverId;
    request.assignedVehicleId = vehicleId;
    await manager.save(request);

    const history = manager.create(TransportStatusHistory, {
      requestId: request.id,
      previousStatus,
      newStatus: 'DRIVER_ASSIGNED',
      changedByUserId: actor.sub,
      changedAt: now,
      source: params.method === 'AUTOMATIC' ? 'SYSTEM' : 'DISPATCHER',
      remarks: `${params.method}: ${driver.name} / ${vehicle.plateNumber}`,
    });
    await manager.save(history);

    await this.auditService.log(
      {
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'FLEET_ASSIGNMENT_CREATED',
        targetId: saved.id,
        targetType: 'fleet_assignment',
        metadata: {
          requestId: request.id,
          driverId,
          vehicleId,
          assignmentMethod: params.method,
          assignmentStrategy: strategy,
          serviceStartAt: serviceStartAt.toISOString(),
          serviceEndAt: serviceEndAt.toISOString(),
          overrideReason: params.overrideReason ?? null,
        },
      },
      manager,
    );

    return {
      ok: true,
      decision: {
        ok: true,
        status: 'ASSIGNED',
        attempts: 0,
        assignment: this.toRef(saved),
      },
    };
  }

  // ─── Candidate rules ──────────────────────────────────────────────────────

  private isAutoCandidateDriver(
    driver: Driver,
    availability: AvailabilityResult<DriverAvailabilityReason> | undefined,
    request: TransportationRequest,
    settings: FleetDispatchSettings,
    method: AssignmentMethod,
  ): boolean {
    if (!availability?.available) return false;
    if (
      !isResourceAllowedByPool({
        resourcePool: driver.assignmentPool,
        requestedPool: request.requestedAssignmentPool,
        executiveReservationMode: settings.executiveReservationMode,
        allowGeneralUseWhenExecutiveAway:
          driver.allowGeneralUseWhenExecutiveAway,
      })
    ) {
      return false;
    }
    if (
      (method === 'AUTOMATIC' || method === 'REASSIGNMENT') &&
      !driver.autoAssignEnabled
    ) {
      return false;
    }
    return true;
  }

  private isAutoCandidateVehicle(
    car: Car,
    availability: AvailabilityResult<VehicleAvailabilityReason> | undefined,
    request: TransportationRequest,
    settings: FleetDispatchSettings,
    method: AssignmentMethod,
  ): boolean {
    if (!availability?.available) return false;
    if (
      !isResourceAllowedByPool({
        resourcePool: car.assignmentPool,
        requestedPool: request.requestedAssignmentPool,
        executiveReservationMode: settings.executiveReservationMode,
        allowGeneralUseWhenExecutiveAway: car.allowGeneralUseWhenExecutiveAway,
      })
    ) {
      return false;
    }
    if (
      (method === 'AUTOMATIC' || method === 'REASSIGNMENT') &&
      !car.autoAssignEnabled
    ) {
      return false;
    }
    return true;
  }

  private evaluateFixedPair(
    drivers: Driver[],
    cars: Car[],
    driverAvailability: Map<string, any>,
    vehicleAvailability: Map<string, any>,
    driverId: string,
    vehicleId: string,
  ): { ok: boolean; failures: string[]; failCode: DispatchFailCode | null } {
    const driver = drivers.find((d) => d.id === driverId);
    const car = cars.find((c) => c.id === vehicleId);

    if (!driver) return this.pairFail(['DRIVER_NOT_FOUND'], 'DRIVER_NOT_FOUND');
    if (!car) return this.pairFail(['VEHICLE_NOT_FOUND'], 'VEHICLE_NOT_FOUND');

    const failures: string[] = [];
    let failCode: DispatchFailCode | null = null;

    const avail = driverAvailability.get(driver.id);
    if (!avail?.available) {
      for (const reason of avail?.reasons ?? ['DRIVER_NOT_FOUND']) {
        failures.push(`Driver ${driver.name}: ${reason}`);
      }
      failCode = this.firstDriverFailCode(avail?.reasons ?? []);
    }
    if (!car) return this.pairFail(failures, failCode ?? 'VEHICLE_NOT_FOUND');

    const vAvail = vehicleAvailability.get(car.id);
    if (!vAvail?.available) {
      for (const reason of vAvail?.reasons ?? ['VEHICLE_NOT_FOUND']) {
        failures.push(`Vehicle ${car.plateNumber}: ${reason}`);
      }
      failCode = failCode ?? this.firstVehicleFailCode(vAvail?.reasons ?? []);
    }

    if (failures.length === 0) {
      return { ok: true, failures: [], failCode: null };
    }
    return { ok: false, failures, failCode };
  }

  private pairFail(
    failures: string[],
    failCode: DispatchFailCode,
  ): { ok: false; failures: string[]; failCode: DispatchFailCode } {
    return { ok: false, failures, failCode };
  }

  private firstDriverFailCode(reasons: string[]): DispatchFailCode {
    const ordered: DispatchFailCode[] = [
      'DRIVER_NOT_FOUND',
      'DRIVER_INACTIVE',
      'NO_DUTY_SCHEDULE',
      'OUTSIDE_SHIFT',
      'REST_DAY',
      'ON_LEAVE',
      'DRIVER_UNAVAILABLE',
      'LICENSE_EXPIRED',
      'AUTO_ASSIGN_DISABLED',
    ];
    for (const code of ordered) {
      if (reasons.includes(code)) return code;
    }
    return 'DRIVER_UNAVAILABLE';
  }

  private firstVehicleFailCode(reasons: string[]): DispatchFailCode {
    const ordered: DispatchFailCode[] = [
      'VEHICLE_NOT_FOUND',
      'VEHICLE_INACTIVE',
      'UNDER_MAINTENANCE',
      'CAPACITY_INSUFFICIENT',
      'VEHICLE_BLOCKED',
      'REGISTRATION_EXPIRED',
      'INSURANCE_EXPIRED',
      'CODING_RESTRICTION',
      'AUTO_ASSIGN_DISABLED',
    ];
    for (const code of ordered) {
      if (reasons.includes(code)) return code;
    }
    return 'VEHICLE_INACTIVE';
  }

  private candidateFailure(
    resources: Array<Driver | Car>,
    availability: Map<
      string,
      AvailabilityResult<DriverAvailabilityReason | VehicleAvailabilityReason>
    >,
    request: TransportationRequest,
    settings: FleetDispatchSettings,
    method: AssignmentMethod,
    kind: 'driver' | 'vehicle',
    serviceStartAt?: Date,
  ): {
    status: 'NO_ELIGIBLE_DRIVER' | 'NO_ELIGIBLE_VEHICLE';
    failures: string[];
    failCode: DispatchFailCode | null;
  } {
    const status =
      kind === 'driver' ? 'NO_ELIGIBLE_DRIVER' : 'NO_ELIGIBLE_VEHICLE';
    let poolExcluded = 0;
    let executiveExcluded = 0;
    const excluded: string[] = [];
    for (const resource of resources) {
      const allowed = isResourceAllowedByPool({
        resourcePool: resource.assignmentPool,
        requestedPool: request.requestedAssignmentPool,
        executiveReservationMode: settings.executiveReservationMode,
        allowGeneralUseWhenExecutiveAway:
          resource.allowGeneralUseWhenExecutiveAway,
      });
      if (!allowed) {
        poolExcluded += 1;
        if (
          resource.assignmentPool === 'EXECUTIVE' &&
          request.requestedAssignmentPool === 'GENERAL' &&
          settings.executiveReservationMode
        ) {
          executiveExcluded += 1;
        }
        continue;
      }
      const result = availability.get(resource.id);
      if (!result?.available) {
        excluded.push(
          ...(result?.reasons ?? [kind.toUpperCase() + '_NOT_FOUND']),
        );
      }
    }

    const label = kind === 'driver' ? 'drivers' : 'vehicles';
    if (executiveExcluded > 0) {
      return {
        status,
        failures: [
          `EXECUTIVE_RESERVATION_POLICY: ${executiveExcluded} executive ${label} reserved while executive reservation mode is on`,
        ],
        failCode: 'EXECUTIVE_RESERVATION_POLICY',
      };
    }
    if (poolExcluded > 0) {
      return {
        status,
        failures: [
          `ASSIGNMENT_POOL_MISMATCH: no ${label} match the requested pool ${request.requestedAssignmentPool}`,
        ],
        failCode: 'ASSIGNMENT_POOL_MISMATCH',
      };
    }
    if (excluded.length === 0) {
      return {
        status,
        failures: [`No eligible ${label} found`],
        failCode: kind === 'driver' ? 'DRIVER_INACTIVE' : 'VEHICLE_INACTIVE',
      };
    }
    return {
      status,
      failures: [
        `No eligible ${label}: ${[...new Set(excluded)].slice(0, 5).join(', ')}`,
      ],
      failCode: kind === 'driver' ? 'DRIVER_UNAVAILABLE' : 'VEHICLE_INACTIVE',
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildShortlist<T>(
    candidates: T[],
    workloads: Map<string, number>,
    strategy: AssignmentStrategy,
    idOf: (item: T) => string,
  ): T[] {
    if (strategy === 'PURE_RANDOM') return candidates;
    const minWorkload = Math.min(
      ...candidates.map((c) => workloads.get(idOf(c)) ?? 0),
    );
    return candidates.filter(
      (c) => (workloads.get(idOf(c)) ?? 0) === minWorkload,
    );
  }

  private workloadComponentScore(
    count: number,
    cap: number,
    weight: number,
  ): number {
    return Math.round(weight * (1 - Math.min(count, cap) / cap));
  }

  private toRef(assignment: FleetAssignment): AssignmentRef {
    return {
      id: assignment.id,
      requestId: assignment.transportationRequestId,
      driverId: assignment.driverId,
      vehicleId: assignment.vehicleId,
      serviceStartAt: assignment.serviceStartAt.toISOString(),
      serviceEndAt: assignment.serviceEndAt.toISOString(),
      assignmentMethod: assignment.assignmentMethod,
      assignmentStrategy: assignment.assignmentStrategy,
      status: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
    };
  }

  private failure(
    status: Exclude<DispatchResultStatus, 'ASSIGNED'>,
    failures: string[],
    attempts: number,
    failCode?: DispatchFailCode | null,
  ): DispatchDecision {
    const code = failCode ?? null;
    return {
      ok: false,
      status,
      failCode: code,
      failures,
      canOverride: code !== null && isOverrideableFailCode(code),
      attempts,
    };
  }

  private async supersedeExisting(
    manager: DataSource['manager'],
    requestId: string,
    actorId: string,
    opts: { reason: string },
  ) {
    const active = await manager.find(FleetAssignment, {
      where: { transportationRequestId: requestId, status: 'ACTIVE' },
    });
    for (const assignment of active) {
      assignment.status = 'SUPERSEDED';
      assignment.supersededAt = new Date();
      assignment.supersededByUserId = actorId;
      assignment.supersedeReason = opts.reason;
      await manager.save(assignment);
    }
    const legacy = await manager.find(TransportAssignment, {
      where: [
        { requestId, status: 'OFFERED' },
        { requestId, status: 'ACCEPTED' },
      ],
    });
    for (const assignment of legacy) {
      assignment.status = 'REASSIGNED';
      await manager.save(assignment);
    }
  }

  private async respondToAssignment(
    actor: { sub: string; email: string },
    requestId: string,
    fleetAssignmentId: string,
    accept: boolean,
    declineReason?: string,
  ) {
    const fleet = await this.fleetRepo.findOne({
      where: { id: fleetAssignmentId, transportationRequestId: requestId },
    });
    if (!fleet) throw new NotFoundException('Fleet assignment not found');
    if (fleet.status !== 'ACTIVE') {
      throw new BadRequestException(
        `Assignment can only be responded to while ACTIVE (current: ${fleet.status})`,
      );
    }

    const request = await this.findRequest(requestId);
    if (
      request.status !== 'DRIVER_ASSIGNED' &&
      request.status !== 'DRIVER_ACCEPTED'
    ) {
      throw new BadRequestException(
        `Cannot respond to assignment in ${request.status} status`,
      );
    }

    if (accept) {
      const legacy = await this.assignmentRepo.findOne({
        where: [
          { requestId, status: 'OFFERED' },
          { requestId, status: 'ACCEPTED' },
        ],
      });
      if (legacy && legacy.status === 'OFFERED') {
        legacy.status = 'ACCEPTED';
        legacy.driverRespondedAt = new Date();
        await this.assignmentRepo.save(legacy);
      }
      await this.transitionWithAudit(
        actor,
        requestId,
        'DRIVER_ACCEPTED',
        'Driver accepted the assignment',
        'DRIVER',
      );
      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'FLEET_ASSIGNMENT_ACCEPTED',
        targetId: fleet.id,
        targetType: 'fleet_assignment',
        metadata: {
          requestId,
          driverId: fleet.driverId,
          vehicleId: fleet.vehicleId,
        },
      });
      return { accepted: true, declined: false, requestId };
    }

    fleet.status = 'CANCELLED';
    await this.fleetRepo.save(fleet);

    const legacy = await this.assignmentRepo.findOne({
      where: [
        { requestId, status: 'OFFERED' },
        { requestId, status: 'ACCEPTED' },
      ],
    });
    if (legacy) {
      legacy.status = 'DECLINED';
      legacy.driverRespondedAt = new Date();
      legacy.declineReason = declineReason ?? null;
      await this.assignmentRepo.save(legacy);
    }

    await this.transitionWithAudit(
      actor,
      requestId,
      'DRIVER_DECLINED',
      `Driver declined: ${declineReason}`,
      'DRIVER',
    );
    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'FLEET_ASSIGNMENT_DECLINED',
      targetId: fleet.id,
      targetType: 'fleet_assignment',
      metadata: {
        requestId,
        driverId: fleet.driverId,
        vehicleId: fleet.vehicleId,
        reason: declineReason,
      },
    });

    return { accepted: false, declined: true, requestId };
  }

  private async transitionWithAudit(
    actor: { sub: string; email: string },
    requestId: string,
    newStatus: TransportationRequest['status'],
    remarks: string,
    source: string,
  ) {
    const request = await this.findRequest(requestId);
    const history = this.historyRepo.create({
      requestId,
      previousStatus: request.status,
      newStatus,
      changedByUserId: actor.sub,
      changedAt: new Date(),
      source: source as any,
      remarks,
    });
    await this.historyRepo.save(history);
    request.status = newStatus;
    if (newStatus === 'DRIVER_DECLINED') {
      request.assignedDriverId = null;
      request.assignedVehicleId = null;
    }
    await this.requestRepo.save(request);
  }

  private async readSettings(): Promise<FleetDispatchSettings> {
    let settings = await this.settingsRepo.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = this.settingsRepo.create({
        id: 1,
        autoDispatchEnabled: false,
        executiveReservationMode: true,
        defaultAssignmentStrategy: 'FAIR_RANDOM',
        updatedByUserId: null,
      });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  private async findRequest(requestId: string): Promise<TransportationRequest> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  private async loadWorkloads(
    driverIds: string[],
    vehicleIds: string[],
  ): Promise<WorkloadSet> {
    const since = new Date(
      Date.now() - WORKLOAD_LOOKBACK_DAYS * 24 * 3_600_000,
    );
    const drivers = new Map<string, number>();
    const vehicles = new Map<string, number>();

    if (driverIds.length > 0) {
      const fleetRows = await this.fleetRepo
        .createQueryBuilder('fa')
        .select('fa.driverId', 'driverId')
        .addSelect('COUNT(*)', 'count')
        .where('fa.driverId IN (:...driverIds)', { driverIds })
        .andWhere('fa.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('fa.createdAt >= :since', { since })
        .groupBy('fa.driverId')
        .getRawMany<{ driverId: string; count: string }>();
      const legacyRows = await this.assignmentRepo
        .createQueryBuilder('a')
        .select('a.driverId', 'driverId')
        .addSelect('COUNT(*)', 'count')
        .where('a.driverId IN (:...driverIds)', { driverIds })
        .andWhere('a.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.createdAt >= :since', { since })
        .groupBy('a.driverId')
        .getRawMany<{ driverId: string; count: string }>();
      for (const row of [...fleetRows, ...legacyRows]) {
        drivers.set(
          row.driverId,
          (drivers.get(row.driverId) ?? 0) + Number(row.count),
        );
      }
    }

    if (vehicleIds.length > 0) {
      const fleetRows = await this.fleetRepo
        .createQueryBuilder('fa')
        .select('fa.vehicleId', 'vehicleId')
        .addSelect('COUNT(*)', 'count')
        .where('fa.vehicleId IN (:...vehicleIds)', { vehicleIds })
        .andWhere('fa.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('fa.createdAt >= :since', { since })
        .groupBy('fa.vehicleId')
        .getRawMany<{ vehicleId: string; count: string }>();
      const legacyRows = await this.assignmentRepo
        .createQueryBuilder('a')
        .select('a.vehicleId', 'vehicleId')
        .addSelect('COUNT(*)', 'count')
        .where('a.vehicleId IN (:...vehicleIds)', { vehicleIds })
        .andWhere('a.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.createdAt >= :since', { since })
        .groupBy('a.vehicleId')
        .getRawMany<{ vehicleId: string; count: string }>();
      for (const row of [...fleetRows, ...legacyRows]) {
        vehicles.set(
          row.vehicleId,
          (vehicles.get(row.vehicleId) ?? 0) + Number(row.count),
        );
      }
    }

    return { drivers, vehicles };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Driver } from '../catalog/drivers/driver.entity';
import { Car } from '../catalog/cars/car.entity';
import { TransportationRequest } from '../transportation/entities/transportation-request.entity';
import { TransportAssignment } from '../transportation/entities/transport-assignment.entity';
import { FleetAvailabilityService } from '../scheduling/services/fleet-availability.service';
import { FleetAssignment } from '../dispatch/entities/fleet-assignment.entity';
import { deriveServiceWindow } from '../scheduling/domain/service-window';
import { intervalsOverlap } from '../scheduling/domain/interval-overlap';
import type {
  DriverDiagnostic,
  VehicleDiagnostic,
  ConflictDiagnostic,
  AssignmentDiagnosticsResult,
  RouteDiagnosticSummary,
} from './diagnostics.domain';

/**
 * READ-ONLY assignment diagnostics/ranking layer (R3 Steps 8–22).
 *
 * This is NOT the R4 assignment engine. Given a Transportation Request it
 * returns a typed snapshot:
 *
 *   - request scheduling summary (canonical service window)
 *   - route summary (persisted snapshot, never a live call)
 *   - driver diagnostics (R2 availability = hard gate, then workload +
 *     schedule-fit scoring)
 *   - vehicle diagnostics (R2 availability = hard gate, then capacity-fit +
 *     workload scoring)
 *   - conflict diagnostics with a dual source (R4): fleet_assignments ACTIVE
 *     overlap is primary; legacy transport_assignments OFFERED/ACCEPTED
 *     overlap (pre-R4 data) is checked in the same pass.
 *   - workload = union of fleet_assignments (status != CANCELLED) and legacy
 *     transport_assignments (status != CANCELLED), rolling 30 days.
 *
 * No side effects. No assignments written. No candidate mutated.
 * No Math.random — all ordering is deterministic (score DESC, then name ASC,
 * then id ASC).
 *
 * QUERY STRATEGY (Step 30 — no N+1):
 *   1 request                (repo.findOne)
 *   1 drivers  (isActive)    (repo.find)
 *   1 cars     (isActive)    (repo.find)
 *   1 schedules (batch)      (FleetAvailabilityService.checkDrivers)
 *   1 blocks    (batch)      (FleetAvailabilityService.checkVehicles)
 *   1 covering shifts        (getCoveringOnDutyShifts)
 *   1 assignments join       (both resource types in one query)
 *   1 workload  driver ids   (GROUP BY)
 *   1 workload  vehicle ids  (GROUP BY)
 * Total: 9 bounded queries regardless of fleet size.
 */

// Request statuses that mean the request no longer occupies fleet resources.
const TERMINAL_REQUEST_STATUSES = [
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'NO_SHOW',
];

// Assignment statuses that indicate the resource is actively held.
const CONSUMING_ASSIGNMENT_STATUSES = ['OFFERED', 'ACCEPTED'];

// Workload lookback for the transitional metric (rolling 30 days).
const WORKLOAD_LOOKBACK_DAYS = 30;

const WORKLOAD_CAP_DRIVER = 8;
const WORKLOAD_CAP_VEHICLE = 10;

type AssignmentRow = {
  assignmentId: string;
  driverId: string;
  vehicleId: string;
  assignmentStatus: string;
  requestId: string;
  requestNumber: string;
  requestStatus: string;
  tripType: string;
  scheduledPickupAt: Date;
  expectedEndAt: Date | null;
  expectedReturnAt: Date | null;
};

@Injectable()
export class FleetAssignmentDiagnosticsService {
  constructor(
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    @InjectRepository(TransportAssignment)
    private readonly assignmentRepo: Repository<TransportAssignment>,
    @InjectRepository(FleetAssignment)
    private readonly fleetAssignmentRepo: Repository<FleetAssignment>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    private readonly availabilityService: FleetAvailabilityService,
  ) {}

  async getDiagnostics(
    requestId: string,
  ): Promise<AssignmentDiagnosticsResult> {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
    });
    if (!request) {
      throw new NotFoundException(
        `Transportation request "${requestId}" not found`,
      );
    }

    const window = deriveServiceWindow(request);
    const route = this.buildRouteSummary(request);
    const currentAssignment = await this.findCurrentAssignment(request.id);

    if (!window.complete) {
      // No canonical service end (no expectedEndAt / expectedReturnAt): the
      // availability evaluation cannot run — nothing is scored or excluded.
      return {
        request: {
          id: request.id,
          requestNumber: request.requestNumber,
          serviceStartAt: window.serviceStartAt.toISOString(),
          serviceEndAt: window.serviceEndAt.toISOString(),
          serviceWindowComplete: false,
          passengerCount: request.passengerCount,
          currentAssignment,
        },
        route,
        drivers: { eligible: [], excluded: [] },
        vehicles: { eligible: [], excluded: [] },
      };
    }

    const [drivers, cars] = await Promise.all([
      this.driverRepo.find({ where: { isActive: true } }),
      this.carRepo.find({ where: { isActive: true } }),
    ]);

    const [driverAvailability, vehicleAvailability, coveringShifts] =
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
          request.passengerCount,
        ),
        this.availabilityService.getCoveringOnDutyShifts(
          drivers.map((driver) => driver.id),
          window.serviceStartAt,
          window.serviceEndAt,
        ),
      ]);

    const [driverConflicts, vehicleConflicts] = await this.loadConflicts(
      drivers.map((driver) => driver.id),
      cars.map((car) => car.id),
      request.id,
      window.serviceStartAt,
      window.serviceEndAt,
    );

    const [driverWorkload, vehicleWorkload] = await this.loadWorkloads(
      drivers.map((driver) => driver.id),
      cars.map((car) => car.id),
    );

    const driverDiagnostics: DriverDiagnostic[] = drivers.map((driver) => {
      const availability = driverAvailability.get(driver.id);
      if (!availability) {
        throw new Error(`Missing availability for driver ${driver.id}`);
      }
      const conflict = driverConflicts.get(driver.id) ?? null;
      const exclusionReasons: string[] = [...availability.reasons];
      if (conflict) exclusionReasons.push('EXISTING_REQUEST_CONFLICT');

      const eligible =
        availability.available &&
        conflict === null &&
        exclusionReasons.length === 0;

      let score: number | null = null;
      let scoreComponents: DriverDiagnostic['scoreComponents'] = null;
      if (eligible) {
        const workloadScore = this.workloadScore(
          driverWorkload.get(driver.id) ?? 0,
          WORKLOAD_CAP_DRIVER,
          { weight: 75 },
        );
        const bufferHours = this.shiftBufferHours(
          coveringShifts.get(driver.id) ?? [],
          window.serviceStartAt,
          window.serviceEndAt,
        );
        const scheduleFit = Math.min(25, Math.round(bufferHours * 2.5));
        scoreComponents = { workload: workloadScore, scheduleFit };
        score = workloadScore + scheduleFit;
      }

      return {
        driverId: driver.id,
        driverName: driver.name,
        hasLiveLocation:
          driver.currentLatitude !== null &&
          driver.currentLatitude !== 0 &&
          driver.currentLongitude !== null &&
          driver.currentLongitude !== 0,
        eligible,
        availability,
        score,
        scoreComponents,
        currentWorkload: driverWorkload.get(driver.id) ?? 0,
        warnings: [...availability.warnings],
        exclusionReasons,
        conflict,
      };
    });

    const vehicleDiagnostics: VehicleDiagnostic[] = cars.map((car) => {
      const availability = vehicleAvailability.get(car.id);
      if (!availability) {
        throw new Error(`Missing availability for vehicle ${car.id}`);
      }
      const conflict = vehicleConflicts.get(car.id) ?? null;
      const exclusionReasons: string[] = [...availability.reasons];
      if (conflict) exclusionReasons.push('EXISTING_REQUEST_CONFLICT');

      const eligible =
        availability.available &&
        conflict === null &&
        exclusionReasons.length === 0;

      let score: number | null = null;
      let scoreComponents: VehicleDiagnostic['scoreComponents'] = null;
      if (eligible) {
        const capacityFit = this.capacityFitScore(
          car.seatingCapacity,
          request.passengerCount,
        );
        const workloadScore = this.workloadScore(
          vehicleWorkload.get(car.id) ?? 0,
          WORKLOAD_CAP_VEHICLE,
          { weight: 40 },
        );
        scoreComponents = { capacityFit, workload: workloadScore };
        score = capacityFit + workloadScore;
      }

      return {
        vehicleId: car.id,
        vehicleName: `${car.make} ${car.model}`.trim() || car.plateNumber,
        plateNumber: car.plateNumber,
        eligible,
        availability,
        score,
        scoreComponents,
        capacity: car.seatingCapacity,
        currentWorkload: vehicleWorkload.get(car.id) ?? 0,
        warnings: [...availability.warnings],
        exclusionReasons,
        conflict,
      };
    });

    return {
      request: {
        id: request.id,
        requestNumber: request.requestNumber,
        serviceStartAt: window.serviceStartAt.toISOString(),
        serviceEndAt: window.serviceEndAt.toISOString(),
        serviceWindowComplete: true,
        passengerCount: request.passengerCount,
        currentAssignment,
      },
      route,
      drivers: {
        eligible: this.sortByScore(
          driverDiagnostics.filter((d) => d.eligible),
          (d) => d.driverName,
          (d) => d.driverId,
        ),
        excluded: this.sortExcluded(
          driverDiagnostics.filter((d) => !d.eligible),
          (d) => d.driverName,
          (d) => d.driverId,
        ),
      },
      vehicles: {
        eligible: this.sortByScore(
          vehicleDiagnostics.filter((v) => v.eligible),
          (v) => v.vehicleName,
          (v) => v.vehicleId,
        ),
        excluded: this.sortExcluded(
          vehicleDiagnostics.filter((v) => !v.eligible),
          (v) => v.vehicleName,
          (v) => v.vehicleId,
        ),
      },
    };
  }

  // ─── Route summary ──────────────────────────────────────────────────────────

  private buildRouteSummary(
    request: TransportationRequest,
  ): RouteDiagnosticSummary {
    const hasSnapshot =
      request.estimatedDistanceMeters !== null ||
      request.estimatedDurationSeconds !== null;
    if (!hasSnapshot) {
      return {
        status: 'UNAVAILABLE',
        distanceMeters: null,
        durationSeconds: null,
        provider: null,
        calculatedAt: null,
      };
    }
    return {
      status: 'AVAILABLE',
      distanceMeters: request.estimatedDistanceMeters,
      durationSeconds: request.estimatedDurationSeconds,
      provider: request.routeProvider,
      calculatedAt: request.routeCalculatedAt?.toISOString() ?? null,
    };
  }

  // ─── Conflict diagnostics (dual source: fleet ACTIVE + legacy consuming) ───

  private async findCurrentAssignment(
    requestId: string,
  ): Promise<AssignmentDiagnosticsResult['request']['currentAssignment']> {
    // R4: canonical fleet_assignments ACTIVE row first.
    const fleet = await this.fleetAssignmentRepo.findOne({
      where: { transportationRequestId: requestId, status: 'ACTIVE' },
      order: { assignedAt: 'DESC' },
    });
    if (fleet) {
      return {
        driverId: fleet.driverId,
        vehicleId: fleet.vehicleId,
        status: 'ACTIVE',
      };
    }
    // Legacy transitional source (pre-R4 rows only).
    const assignment = await this.assignmentRepo.findOne({
      where: {
        requestId,
        status: In(CONSUMING_ASSIGNMENT_STATUSES),
      },
      order: { assignedAt: 'DESC' },
    });
    return assignment
      ? {
          driverId: assignment.driverId,
          vehicleId: assignment.vehicleId,
          status: assignment.status,
        }
      : null;
  }

  private async loadConflicts(
    driverIds: string[],
    vehicleIds: string[],
    currentRequestId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<
    [Map<string, ConflictDiagnostic>, Map<string, ConflictDiagnostic>]
  > {
    const driverConflicts = new Map<string, ConflictDiagnostic>();
    const vehicleConflicts = new Map<string, ConflictDiagnostic>();
    if (driverIds.length === 0 && vehicleIds.length === 0) {
      return [driverConflicts, vehicleConflicts];
    }

    const fleetRows = await this.loadFleetConflicts(
      driverIds,
      vehicleIds,
      currentRequestId,
      startAt,
      endAt,
    );
    for (const row of fleetRows) {
      const diagnostic: ConflictDiagnostic = {
        requestId: row.requestId,
        requestNumber: row.requestNumber,
        startAt: row.startAt.toISOString(),
        endAt: row.endAt.toISOString(),
        source: 'FLEET',
      };
      if (driverIds.includes(row.driverId)) {
        driverConflicts.set(row.driverId, diagnostic);
      }
      if (vehicleIds.includes(row.vehicleId)) {
        vehicleConflicts.set(row.vehicleId, diagnostic);
      }
    }

    const legacyRows = await this.loadLegacyConflicts(
      driverIds,
      vehicleIds,
      currentRequestId,
      startAt,
      endAt,
    );
    for (const row of legacyRows) {
      const otherWindow = deriveServiceWindow({
        tripType: row.tripType as 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_STOP',
        scheduledPickupAt: row.scheduledPickupAt,
        expectedEndAt: row.expectedEndAt,
        expectedReturnAt: row.expectedReturnAt,
      });
      if (!otherWindow.complete) continue;
      const diagnostic: ConflictDiagnostic = {
        requestId: row.requestId,
        requestNumber: row.requestNumber,
        startAt: otherWindow.serviceStartAt.toISOString(),
        endAt: otherWindow.serviceEndAt.toISOString(),
        source: 'LEGACY',
      };
      if (driverIds.includes(row.driverId)) {
        driverConflicts.set(row.driverId, diagnostic);
      }
      if (vehicleIds.includes(row.vehicleId)) {
        vehicleConflicts.set(row.vehicleId, diagnostic);
      }
    }

    return [driverConflicts, vehicleConflicts];
  }

  /** R4 primary: ACTIVE fleet_assignments whose service window overlaps. */
  private async loadFleetConflicts(
    driverIds: string[],
    vehicleIds: string[],
    currentRequestId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<
    Array<{
      requestId: string;
      requestNumber: string;
      driverId: string;
      vehicleId: string;
      startAt: Date;
      endAt: Date;
    }>
  > {
    const qb = this.fleetAssignmentRepo
      .createQueryBuilder('fa')
      .innerJoin(
        'transportation_requests',
        'r',
        'r.id = fa.transportationRequestId AND r.status NOT IN (:...terminalStatuses)',
        { terminalStatuses: TERMINAL_REQUEST_STATUSES },
      )
      .select([
        'fa.transportationRequestId AS "requestId"',
        'fa.driverId AS "driverId"',
        'fa.vehicleId AS "vehicleId"',
        'fa.serviceStartAt AS "startAt"',
        'fa.serviceEndAt AS "endAt"',
        'r.requestNumber AS "requestNumber"',
      ])
      .where('fa.status = :status', { status: 'ACTIVE' })
      .andWhere('fa.transportationRequestId != :currentRequestId', {
        currentRequestId,
      })
      .andWhere(
        `(fa.driverId IN (:...driverIds) OR fa.vehicleId IN (:...vehicleIds))`,
        { driverIds, vehicleIds },
      )
      .andWhere('fa.serviceStartAt < :endAt', { endAt })
      .andWhere('fa.serviceEndAt > :startAt', { startAt });
    return qb.getRawMany<{
      requestId: string;
      requestNumber: string;
      driverId: string;
      vehicleId: string;
      startAt: Date;
      endAt: Date;
    }>();
  }

  /** Legacy transitional: OFFERED/ACCEPTED rows whose request window overlaps. */
  private async loadLegacyConflicts(
    driverIds: string[],
    vehicleIds: string[],
    currentRequestId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<AssignmentRow[]> {
    const whereClauses: string[] = [];
    const params: Record<string, unknown> = {
      currentRequestId,
      assignmentStatuses: CONSUMING_ASSIGNMENT_STATUSES,
      terminalStatuses: TERMINAL_REQUEST_STATUSES,
    };
    if (driverIds.length > 0) {
      whereClauses.push('a.driverId IN (:...driverIds)');
      params['driverIds'] = driverIds;
    }
    if (vehicleIds.length > 0) {
      whereClauses.push('a.vehicleId IN (:...vehicleIds)');
      params['vehicleIds'] = vehicleIds;
    }

    const rows = await this.assignmentRepo
      .createQueryBuilder('a')
      .innerJoin('transportation_requests', 'r', 'r.id = a.requestId')
      .select([
        'a.id AS "assignmentId"',
        'a.driverId AS "driverId"',
        'a.vehicleId AS "vehicleId"',
        'a.status AS "assignmentStatus"',
        'r.id AS "requestId"',
        'r.requestNumber AS "requestNumber"',
        'r.status AS "requestStatus"',
        'r.tripType AS "tripType"',
        'r.scheduledPickupAt AS "scheduledPickupAt"',
        'r.expectedEndAt AS "expectedEndAt"',
        'r.expectedReturnAt AS "expectedReturnAt"',
      ])
      .where(`(${whereClauses.join(' OR ')})`)
      .andWhere('a.status IN (:...assignmentStatuses)')
      .andWhere('r.status NOT IN (:...terminalStatuses)')
      .andWhere('r.id != :currentRequestId')
      .setParameters(params)
      .getRawMany<AssignmentRow>();

    const result: AssignmentRow[] = [];
    for (const row of rows) {
      if (TERMINAL_REQUEST_STATUSES.includes(row.requestStatus)) continue;
      const otherWindow = deriveServiceWindow({
        tripType: row.tripType as 'ONE_WAY' | 'ROUND_TRIP' | 'MULTI_STOP',
        scheduledPickupAt: row.scheduledPickupAt,
        expectedEndAt: row.expectedEndAt,
        expectedReturnAt: row.expectedReturnAt,
      });
      if (!otherWindow.complete) continue;
      if (
        !intervalsOverlap(
          otherWindow.serviceStartAt,
          otherWindow.serviceEndAt,
          startAt,
          endAt,
        )
      ) {
        continue;
      }
      result.push(row);
    }
    return result;
  }

  // ─── Workload metric (union of fleet + legacy, diagnostic only) ───────────

  private async loadWorkloads(
    driverIds: string[],
    vehicleIds: string[],
  ): Promise<[Map<string, number>, Map<string, number>]> {
    const since = new Date(
      Date.now() - WORKLOAD_LOOKBACK_DAYS * 24 * 3_600_000,
    );
    const driverWorkload = new Map<string, number>();
    const vehicleWorkload = new Map<string, number>();

    if (driverIds.length > 0) {
      const fleetDriverRows = await this.fleetAssignmentRepo
        .createQueryBuilder('fa')
        .select('fa.driverId', 'driverId')
        .addSelect('COUNT(*)', 'count')
        .where('fa.driverId IN (:...driverIds)', { driverIds })
        .andWhere('fa.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('fa.createdAt >= :since', { since })
        .groupBy('fa.driverId')
        .getRawMany<{ driverId: string; count: string }>();
      for (const row of fleetDriverRows) {
        driverWorkload.set(
          row.driverId,
          (driverWorkload.get(row.driverId) ?? 0) + Number(row.count),
        );
      }
      const legacyDriverRows = await this.assignmentRepo
        .createQueryBuilder('a')
        .innerJoin(
          'transportation_requests',
          'r',
          'r.id = a.requestId AND r.status NOT IN (:...terminalStatuses)',
        )
        .select('a.driverId', 'driverId')
        .addSelect('COUNT(*)', 'count')
        .where('a.driverId IN (:...driverIds)', { driverIds })
        .andWhere('a.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.createdAt >= :since', { since })
        .setParameter('terminalStatuses', TERMINAL_REQUEST_STATUSES)
        .groupBy('a.driverId')
        .getRawMany<{ driverId: string; count: string }>();
      for (const row of legacyDriverRows) {
        driverWorkload.set(
          row.driverId,
          (driverWorkload.get(row.driverId) ?? 0) + Number(row.count),
        );
      }
    }

    if (vehicleIds.length > 0) {
      const fleetVehicleRows = await this.fleetAssignmentRepo
        .createQueryBuilder('fa')
        .select('fa.vehicleId', 'vehicleId')
        .addSelect('COUNT(*)', 'count')
        .where('fa.vehicleId IN (:...vehicleIds)', { vehicleIds })
        .andWhere('fa.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('fa.createdAt >= :since', { since })
        .groupBy('fa.vehicleId')
        .getRawMany<{ vehicleId: string; count: string }>();
      for (const row of fleetVehicleRows) {
        vehicleWorkload.set(
          row.vehicleId,
          (vehicleWorkload.get(row.vehicleId) ?? 0) + Number(row.count),
        );
      }
      const legacyVehicleRows = await this.assignmentRepo
        .createQueryBuilder('a')
        .innerJoin(
          'transportation_requests',
          'r',
          'r.id = a.requestId AND r.status NOT IN (:...terminalStatuses)',
        )
        .select('a.vehicleId', 'vehicleId')
        .addSelect('COUNT(*)', 'count')
        .where('a.vehicleId IN (:...vehicleIds)', { vehicleIds })
        .andWhere('a.status != :cancelled', { cancelled: 'CANCELLED' })
        .andWhere('a.createdAt >= :since', { since })
        .setParameter('terminalStatuses', TERMINAL_REQUEST_STATUSES)
        .groupBy('a.vehicleId')
        .getRawMany<{ vehicleId: string; count: string }>();
      for (const row of legacyVehicleRows) {
        vehicleWorkload.set(
          row.vehicleId,
          (vehicleWorkload.get(row.vehicleId) ?? 0) + Number(row.count),
        );
      }
    }

    return [driverWorkload, vehicleWorkload];
  }

  // ─── Scoring (transparent, deterministic, documented) ───────────────────────

  /**
   * Workload fairness: fewer assignments in the rolling 30-day window scores
   * higher. Linear from full weight (0 assignments) to 0 at the cap.
   */
  private workloadScore(
    count: number,
    cap: number,
    weight: number | { weight: number },
  ): number {
    const w = typeof weight === 'number' ? weight : weight.weight;
    return Math.round(w * (1 - Math.min(count, cap) / cap));
  }

  /**
   * Schedule fit (drivers): total buffer hours the covering ON_DUTY shifts
   * have around the requested window (before + after), each side capped at
   * the window's own length so a single huge shift cannot dominate.
   * 2h of buffer → 5 pts; 10h+ → full 25 pts.
   */
  private shiftBufferHours(
    coveringShifts: Array<{ startAt: Date; endAt: Date }>,
    startAt: Date,
    endAt: Date,
  ): number {
    const windowHours = (endAt.getTime() - startAt.getTime()) / 3_600_000;
    let total = 0;
    for (const shift of coveringShifts) {
      const before = (startAt.getTime() - shift.startAt.getTime()) / 3_600_000;
      const after = (shift.endAt.getTime() - endAt.getTime()) / 3_600_000;
      total +=
        Math.max(0, Math.min(before, windowHours)) +
        Math.max(0, Math.min(after, windowHours));
    }
    return total;
  }

  /**
   * Capacity fit (vehicles): 60 pts when excess seats are <= 1; -6 pts per
   * additional excess seat; floor 20 so legitimate large vehicles are not
   * penalized into absurdity. Unknown passenger count → neutral 40 (caller
   * adds a warning).
   */
  private capacityFitScore(capacity: number, passengerCount: number): number {
    const excess = capacity - passengerCount;
    if (excess <= 1) return 60;
    return Math.max(20, 60 - excess * 6);
  }

  // ─── Deterministic ordering ─────────────────────────────────────────────────

  private sortByScore<T>(
    items: T[],
    nameOf: (item: T) => string,
    idOf: (item: T) => string,
  ): T[] {
    const scoreOf = (item: T) =>
      Number((item as unknown as { score: number | null }).score ?? 0);
    return [...items].sort((a, b) => {
      const diff = scoreOf(b) - scoreOf(a);
      if (diff !== 0) return diff;
      const nameDiff = nameOf(a).localeCompare(nameOf(b));
      if (nameDiff !== 0) return nameDiff;
      return idOf(a).localeCompare(idOf(b));
    });
  }

  private sortExcluded<T>(
    items: T[],
    nameOf: (item: T) => string,
    idOf: (item: T) => string,
  ): T[] {
    return [...items].sort((a, b) => {
      const nameDiff = nameOf(a).localeCompare(nameOf(b));
      if (nameDiff !== 0) return nameDiff;
      return idOf(a).localeCompare(idOf(b));
    });
  }
}

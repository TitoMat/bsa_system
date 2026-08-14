import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { FleetAssignment } from '../entities/fleet-assignment.entity';
import { TransportationRequest } from '../../transportation/entities/transportation-request.entity';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import type { FleetAssignmentPool } from '../../catalog/fleet-domain';
import { classifyRouteFreshness } from '../utils/routeFreshness';
import type { RouteFreshness } from '../utils/routeFreshness';

type Period = { startAt: Date; endAt: Date };

type AnalyticsQuery = {
  period: 'today' | '7d' | '30d' | 'custom';
  startAt?: string;
  endAt?: string;
  assignmentPool?: FleetAssignmentPool;
};

type DriverWorkload = {
  driverId: string;
  driverName: string;
  assignmentPool: string;
  tripCount: number;
  activeAssignmentCount: number;
  completedAssignmentCount: number;
  cancelledAssignmentCount: number;
  scheduledServiceHours: number;
  automaticAssignmentCount: number;
  manualAssignmentCount: number;
  overrideAssignmentCount: number;
  reassignmentCount: number;
};

type VehicleUtilization = {
  vehicleId: string;
  vehicleName: string;
  plateNumber: string;
  assignmentPool: string;
  tripCount: number;
  activeAssignmentCount: number;
  scheduledServiceHours: number;
  automaticAssignmentCount: number;
  manualAssignmentCount: number;
  overrideAssignmentCount: number;
};

type FairnessView = {
  pool: string;
  driverCount: number;
  minAssignments: number;
  maxAssignments: number;
  averageAssignments: number;
  spread: number;
  drivers: Array<{ id: string; name: string; assignmentCount: number }>;
};

type DispatchMetrics = {
  automatic: number;
  manual: number;
  override: number;
  reassignment: number;
};

type ExceptionAggregation = Record<string, number>;

type AnalyticsResponse = {
  period: { startAt: string; endAt: string };
  summary: {
    totalRequests: number;
    totalAssignments: number;
    completedTrips: number;
    activeTrips: number;
    unassignedRequests: number;
    redispatchCount: number;
  };
  dispatch: DispatchMetrics;
  drivers: DriverWorkload[];
  vehicles: VehicleUtilization[];
  fairness: {
    byPool: Record<string, FairnessView>;
  };
  exceptions: ExceptionAggregation;
  routeHealth: Record<RouteFreshness, number>;
};

/**
 * R5C — Fleet Operations Analytics.
 *
 * READ-ONLY. Aggregate queries over fleet_assignments, transportation_requests,
 * drivers, and cars. No mutations. All metrics derived from canonical data.
 */
@Injectable()
export class FleetOperationsAnalyticsService {
  constructor(
    @InjectRepository(FleetAssignment)
    private readonly fleetRepo: Repository<FleetAssignment>,
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
  ) {}

  async getAnalytics(query: AnalyticsQuery): Promise<AnalyticsResponse> {
    const period = this.resolvePeriod(query);

    const [assignments, requests, drivers, cars] = await Promise.all([
      this.fleetRepo.find({
        where: { assignedAt: Between(period.startAt, period.endAt) },
      }),
      this.requestRepo.find({
        where: { scheduledPickupAt: Between(period.startAt, period.endAt) },
      }),
      this.driverRepo.find(),
      this.carRepo.find(),
    ]);

    const pool = query.assignmentPool;
    const poolFilter = (r: { assignmentPool?: string }) =>
      !pool || r.assignmentPool === pool;

    // Only count non-SUPERSEDED, non-CANCELLED assignments as trips
    const tripAssignments = assignments.filter(
      (a) => a.status !== 'SUPERSEDED' && a.status !== 'CANCELLED',
    );
    const supersededCancelled = assignments.filter(
      (a) => a.status === 'SUPERSEDED' || a.status === 'CANCELLED',
    );
    const byDriver = new Map<string, FleetAssignment[]>();
    const byVehicle = new Map<string, FleetAssignment[]>();
    for (const a of tripAssignments) {
      const d = byDriver.get(a.driverId) ?? [];
      d.push(a);
      byDriver.set(a.driverId, d);
      const v = byVehicle.get(a.vehicleId) ?? [];
      v.push(a);
      byVehicle.set(a.vehicleId, v);
    }

    const driverWorkloads: DriverWorkload[] = drivers
      .filter(poolFilter)
      .map((d) => {
        const asgn = byDriver.get(d.id) ?? [];
        const hours = asgn.reduce(
          (sum, a) =>
            sum +
            (a.serviceEndAt.getTime() - a.serviceStartAt.getTime()) /
              3_600_000,
          0,
        );
        return {
          driverId: d.id,
          driverName: d.name,
          assignmentPool: d.assignmentPool,
          tripCount: asgn.length,
          activeAssignmentCount: asgn.filter((a) => a.status === 'ACTIVE').length,
          completedAssignmentCount: asgn.filter((a) => a.status === 'COMPLETED').length,
          cancelledAssignmentCount: 0,
          scheduledServiceHours: Math.round(hours * 10) / 10,
          automaticAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'AUTOMATIC').length,
          manualAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'MANUAL').length,
          overrideAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'OVERRIDE').length,
          reassignmentCount: asgn.filter((a) => a.assignmentMethod === 'REASSIGNMENT').length,
        };
      });

    const vehicleUtilizations: VehicleUtilization[] = cars
      .filter(poolFilter)
      .map((v) => {
        const asgn = byVehicle.get(v.id) ?? [];
        const hours = asgn.reduce(
          (sum, a) =>
            sum +
            (a.serviceEndAt.getTime() - a.serviceStartAt.getTime()) /
              3_600_000,
          0,
        );
        return {
          vehicleId: v.id,
          vehicleName: `${v.make} ${v.model}`.trim() || v.plateNumber,
          plateNumber: v.plateNumber,
          assignmentPool: v.assignmentPool,
          tripCount: asgn.length,
          activeAssignmentCount: asgn.filter((a) => a.status === 'ACTIVE').length,
          scheduledServiceHours: Math.round(hours * 10) / 10,
          automaticAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'AUTOMATIC').length,
          manualAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'MANUAL').length,
          overrideAssignmentCount: asgn.filter((a) => a.assignmentMethod === 'OVERRIDE').length,
        };
      });

    // Fairness by pool
    const fairnessByPool: Record<string, FairnessView> = {};
    const pools = ['GENERAL', 'EXECUTIVE', 'SPECIAL'] as FleetAssignmentPool[];
    for (const p of pools) {
      const poolDrivers = driverWorkloads.filter((d) => d.assignmentPool === p);
      if (poolDrivers.length === 0) continue;
      const counts = poolDrivers.map((d) => d.tripCount);
      const min = Math.min(...counts);
      const max = Math.max(...counts);
      const avg = Math.round((counts.reduce((s, c) => s + c, 0) / poolDrivers.length) * 10) / 10;
      fairnessByPool[p] = {
        pool: p,
        driverCount: poolDrivers.length,
        minAssignments: min,
        maxAssignments: max,
        averageAssignments: avg,
        spread: max - min,
        drivers: poolDrivers.map((d) => ({
          id: d.driverId,
          name: d.driverName,
          assignmentCount: d.tripCount,
        })),
      };
    }

    // Dispatch metrics
    const dispatch: DispatchMetrics = {
      automatic: tripAssignments.filter((a) => a.assignmentMethod === 'AUTOMATIC').length,
      manual: tripAssignments.filter((a) => a.assignmentMethod === 'MANUAL').length,
      override: tripAssignments.filter((a) => a.assignmentMethod === 'OVERRIDE').length,
      reassignment: tripAssignments.filter((a) => a.assignmentMethod === 'REASSIGNMENT').length,
    };

    // Exception aggregation
    const exceptions: Record<string, number> = {
      DRIVER_DECLINED: requests.filter((r) => r.status === 'DRIVER_DECLINED').length,
      NO_ELIGIBLE_DRIVER: 0,
      NO_ELIGIBLE_VEHICLE: 0,
      NO_ELIGIBLE_PAIR: requests.filter((r) =>
        ['FOR_DISPATCH', 'APPROVED', 'REASSIGNMENT_REQUIRED'].includes(r.status),
      ).length,
      REDISPATCH_FAILED: 0,
      ROUTE_UNAVAILABLE: requests.filter(
        (r) => !r.routeProvider && !['COMPLETED', 'CANCELLED', 'DRAFT'].includes(r.status),
      ).length,
    };
    exceptions.REDISPATCH_COUNT = supersededCancelled.filter(
      (a) => a.assignmentMethod === 'REASSIGNMENT' || a.supersedeReason != null,
    ).length;

    // Route health
    const routeFreshnessCounts: Record<RouteFreshness, number> = {
      FRESH: 0,
      AGING: 0,
      STALE: 0,
      UNAVAILABLE: 0,
    };
    for (const r of requests) {
      routeFreshnessCounts[classifyRouteFreshness(r.routeCalculatedAt)] += 1;
    }

    const activeTripStatuses = new Set([
      'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PASSENGER_ONBOARD',
      'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'DELAYED',
    ]);
    const unassignedStatuses = new Set([
      'APPROVED', 'FOR_DISPATCH', 'DRIVER_DECLINED', 'REASSIGNMENT_REQUIRED',
    ]);

    return {
      period: { startAt: period.startAt.toISOString(), endAt: period.endAt.toISOString() },
      summary: {
        totalRequests: requests.length,
        totalAssignments: tripAssignments.length,
        completedTrips: requests.filter((r) => r.status === 'COMPLETED').length,
        activeTrips: requests.filter((r) => activeTripStatuses.has(r.status)).length,
        unassignedRequests: requests.filter((r) => unassignedStatuses.has(r.status)).length,
        redispatchCount: assignments.filter((a) => a.assignmentMethod === 'REASSIGNMENT').length,
      },
      dispatch,
      drivers: driverWorkloads,
      vehicles: vehicleUtilizations,
      fairness: { byPool: fairnessByPool },
      exceptions,
      routeHealth: routeFreshnessCounts,
    };
  }

  private resolvePeriod(query: AnalyticsQuery): Period {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    switch (query.period) {
      case 'today': {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { startAt: start, endAt: end };
      }
      case '7d': {
        const start = new Date(end.getTime() - 7 * 24 * 3_600_000);
        return { startAt: start, endAt: end };
      }
      case '30d': {
        const start = new Date(end.getTime() - 30 * 24 * 3_600_000);
        return { startAt: start, endAt: end };
      }
      case 'custom':
      default: {
        const start = query.startAt ? new Date(query.startAt) : new Date(end.getTime() - 30 * 24 * 3_600_000);
        const customEnd = query.endAt ? new Date(query.endAt) : end;
        if (customEnd <= start) throw new Error('endAt must be after startAt');
        return { startAt: start, endAt: customEnd };
      }
    }
  }
}

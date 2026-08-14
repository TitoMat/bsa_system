import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Driver } from '../../catalog/drivers/driver.entity';
import { Car } from '../../catalog/cars/car.entity';
import { DriverDutySchedule } from '../entities/driver-duty-schedule.entity';
import { VehicleAvailabilityBlock } from '../entities/vehicle-availability-block.entity';
import {
  AvailabilityResult,
  buildAvailabilityResult,
  DriverAvailabilityReason,
  VehicleAvailabilityReason,
} from '../domain/scheduling-domain';
import { intervalsOverlap, intervalContains } from '../domain/interval-overlap';
import {
  resolveScheduleInterval,
  weekdayNameInPhilippines,
} from '../domain/shift-time';
import { PHILIPPINE_TIME_OFFSET_MS } from '../domain/scheduling-domain';

/**
 * READ-ONLY availability evaluation (R2 Steps 10–11).
 *
 * Answers "COULD this driver work during this interval?" and "COULD this
 * vehicle be used during this interval?" — it never assigns, never writes,
 * never picks anyone. Existing fleet_assignment conflicts are intentionally
 * NOT checked: fleet_assignments do not exist yet (R4+).
 */

@Injectable()
export class FleetAvailabilityService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    @InjectRepository(DriverDutySchedule)
    private readonly scheduleRepo: Repository<DriverDutySchedule>,
    @InjectRepository(VehicleAvailabilityBlock)
    private readonly blockRepo: Repository<VehicleAvailabilityBlock>,
  ) {}

  private assertValidRange(startAt: Date, endAt: Date): void {
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('endAt must be after startAt');
    }
  }

  // ─── Driver ─────────────────────────────────────────────────────────────────

  async checkDriver(
    driverId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<AvailabilityResult<DriverAvailabilityReason>> {
    this.assertValidRange(startAt, endAt);

    const driver = await this.driverRepo.findOne({ where: { id: driverId } });
    if (!driver) {
      const { result, reasons } =
        buildAvailabilityResult<DriverAvailabilityReason>(startAt, endAt);
      reasons.push('DRIVER_NOT_FOUND');
      return result;
    }

    const schedules = await this.findSchedulesOverlappingWindow(
      driverId,
      startAt,
      endAt,
    );
    return this.evaluateDriver(driver, schedules, startAt, endAt);
  }

  /**
   * R3 (Step 30): batch driver evaluation. One schedules query for all
   * drivers instead of one query per driver. Shared evaluation rules with
   * checkDriver() — no duplicated availability logic.
   */
  async checkDrivers(
    drivers: Driver[],
    startAt: Date,
    endAt: Date,
  ): Promise<Map<string, AvailabilityResult<DriverAvailabilityReason>>> {
    this.assertValidRange(startAt, endAt);

    const driverMap = new Map(drivers.map((driver) => [driver.id, driver]));
    const schedulesByDriver = await this.findAllSchedulesOverlappingWindow(
      [...driverMap.keys()],
      startAt,
      endAt,
    );

    const results = new Map<
      string,
      AvailabilityResult<DriverAvailabilityReason>
    >();
    for (const driver of drivers) {
      results.set(
        driver.id,
        this.evaluateDriver(
          driver,
          schedulesByDriver.get(driver.id) ?? [],
          startAt,
          endAt,
        ),
      );
    }
    return results;
  }

  /**
   * R3 (Step 17): covering ON_DUTY shift intervals for schedule-fit scoring.
   * Read-only; same resolver + containment rules as availability evaluation.
   */
  async getCoveringOnDutyShifts(
    driverIds: string[],
    startAt: Date,
    endAt: Date,
  ): Promise<Map<string, Array<{ startAt: Date; endAt: Date }>>> {
    if (driverIds.length === 0) return new Map();
    const byDriver = await this.findAllSchedulesOverlappingWindow(
      driverIds,
      startAt,
      endAt,
    );
    const result = new Map<string, Array<{ startAt: Date; endAt: Date }>>();
    for (const [driverId, schedules] of byDriver) {
      const covering = schedules
        .filter(
          (s) =>
            s.status === 'ON_DUTY' &&
            intervalContains(s.startAt, s.endAt, startAt, endAt),
        )
        .map((s) => ({ startAt: s.startAt, endAt: s.endAt }));
      result.set(driverId, covering);
    }
    return result;
  }

  /**
   * Pure per-driver evaluation shared by the single and batch paths.
   * Deterministic: same driver + schedules + window → same result.
   */
  private evaluateDriver(
    driver: Driver,
    schedules: Array<{ status: string; startAt: Date; endAt: Date }>,
    startAt: Date,
    endAt: Date,
  ): AvailabilityResult<DriverAvailabilityReason> {
    const { result, reasons, warnings } =
      buildAvailabilityResult<DriverAvailabilityReason>(startAt, endAt);

    if (!driver.isActive) {
      reasons.push('DRIVER_INACTIVE');
    }
    if (!driver.autoAssignEnabled) {
      reasons.push('AUTO_ASSIGN_DISABLED');
    }

    // License (where recorded).
    if (driver.licenseExpiry) {
      const expiryInstant = this.endOfLocalDay(driver.licenseExpiry);
      if (expiryInstant.getTime() < startAt.getTime()) {
        reasons.push('LICENSE_EXPIRED');
      } else if (expiryInstant.getTime() <= endAt.getTime()) {
        warnings.push('LICENSE_EXPIRED');
      }
    }

    // Live duty flag: blocked only when the flag positively excludes work.
    if (driver.dutyStatus === 'SUSPENDED') {
      reasons.push('DRIVER_UNAVAILABLE');
    } else if (driver.dutyStatus === 'ON_LEAVE') {
      reasons.push('ON_LEAVE');
    } else if (driver.dutyStatus === 'ON_BREAK') {
      reasons.push('DRIVER_UNAVAILABLE');
    }
    // OFF_DUTY is neutral: an ON_DUTY schedule record for the window is what permits work.

    // Planned duty schedules (R2: concrete duty-date records only).
    const onDutyCovers = schedules.some(
      (s) =>
        s.status === 'ON_DUTY' &&
        intervalContains(s.startAt, s.endAt, startAt, endAt),
    );
    const onDutyPartial = schedules.some(
      (s) =>
        s.status === 'ON_DUTY' &&
        intervalsOverlap(s.startAt, s.endAt, startAt, endAt) &&
        !intervalContains(s.startAt, s.endAt, startAt, endAt),
    );
    const restDayOverlap = schedules.some((s) => s.status === 'REST_DAY');
    const leaveOverlap = schedules.some((s) => s.status === 'LEAVE');
    const unavailableOverlap = schedules.some(
      (s) => s.status === 'UNAVAILABLE',
    );

    if (!schedules.some((s) => s.status === 'ON_DUTY')) {
      reasons.push('NO_DUTY_SCHEDULE');
    } else if (!onDutyCovers) {
      if (onDutyPartial) {
        reasons.push('OUTSIDE_SHIFT');
      } else {
        reasons.push('NO_DUTY_SCHEDULE');
      }
    }
    if (restDayOverlap) reasons.push('REST_DAY');
    if (leaveOverlap) reasons.push('ON_LEAVE');
    if (unavailableOverlap) reasons.push('DRIVER_UNAVAILABLE');

    result.available = reasons.length === 0;
    return result;
  }

  private async findSchedulesOverlappingWindow(
    driverId: string,
    startAt: Date,
    endAt: Date,
  ): Promise<Array<{ status: string; startAt: Date; endAt: Date }>> {
    const byDriver = await this.findAllSchedulesOverlappingWindow(
      [driverId],
      startAt,
      endAt,
    );
    return byDriver.get(driverId) ?? [];
  }

  /**
   * Batch variant: ONE query for many drivers (R3 Step 30 — no per-driver
   * query loop). Search one local calendar day on each side so overnight
   * shifts spanning the window boundary are captured; resolution is exact
   * via resolveScheduleInterval().
   */
  private async findAllSchedulesOverlappingWindow(
    driverIds: string[],
    startAt: Date,
    endAt: Date,
  ): Promise<
    Map<string, Array<{ status: string; startAt: Date; endAt: Date }>>
  > {
    if (driverIds.length === 0) return new Map();
    const from = this.toLocalYmd(new Date(startAt.getTime() - 24 * 3_600_000));
    const to = this.toLocalYmd(new Date(endAt.getTime() + 24 * 3_600_000));

    const records = await this.scheduleRepo.find({
      where: { driverId: In(driverIds) },
    });

    const grouped = new Map<
      string,
      Array<{ status: string; startAt: Date; endAt: Date }>
    >();
    for (const record of records) {
      if (record.scheduleDate < from || record.scheduleDate > to) continue;
      try {
        const resolved = resolveScheduleInterval(
          record.scheduleDate,
          record.shiftStart,
          record.shiftEnd,
        );
        if (
          intervalsOverlap(resolved.startAt, resolved.endAt, startAt, endAt)
        ) {
          const list = grouped.get(record.driverId) ?? [];
          list.push({
            status: record.status,
            startAt: resolved.startAt,
            endAt: resolved.endAt,
          });
          grouped.set(record.driverId, list);
        }
      } catch {
        // Malformed schedule record — skip (it cannot cover any window).
      }
    }
    return grouped;
  }

  // ─── Vehicle ────────────────────────────────────────────────────────────────

  async checkVehicle(
    vehicleId: string,
    startAt: Date,
    endAt: Date,
    passengerCount?: number,
  ): Promise<AvailabilityResult<VehicleAvailabilityReason>> {
    this.assertValidRange(startAt, endAt);

    const car = await this.carRepo.findOne({ where: { id: vehicleId } });
    if (!car) {
      const { result, reasons } =
        buildAvailabilityResult<VehicleAvailabilityReason>(startAt, endAt);
      reasons.push('VEHICLE_NOT_FOUND');
      return result;
    }

    const blocks = await this.findBlocksOverlappingWindow(
      [vehicleId],
      startAt,
      endAt,
    );
    return this.evaluateVehicle(
      car,
      blocks.get(vehicleId) ?? 0,
      startAt,
      endAt,
      passengerCount,
    );
  }

  /**
   * R3 (Step 30): batch vehicle evaluation. One blocks query for all
   * vehicles; shares the exact rules with checkVehicle().
   */
  async checkVehicles(
    cars: Car[],
    startAt: Date,
    endAt: Date,
    passengerCount?: number,
  ): Promise<Map<string, AvailabilityResult<VehicleAvailabilityReason>>> {
    this.assertValidRange(startAt, endAt);

    const blocksByVehicle = await this.findBlocksOverlappingWindow(
      cars.map((car) => car.id),
      startAt,
      endAt,
    );

    const results = new Map<
      string,
      AvailabilityResult<VehicleAvailabilityReason>
    >();
    for (const car of cars) {
      results.set(
        car.id,
        this.evaluateVehicle(
          car,
          blocksByVehicle.get(car.id) ?? 0,
          startAt,
          endAt,
          passengerCount,
        ),
      );
    }
    return results;
  }

  /**
   * Pure per-vehicle evaluation shared by the single and batch paths.
   * Deterministic: same car + block count + window → same result.
   */
  private evaluateVehicle(
    car: Car,
    overlappingBlockCount: number,
    startAt: Date,
    endAt: Date,
    passengerCount?: number,
  ): AvailabilityResult<VehicleAvailabilityReason> {
    const { result, reasons, warnings } =
      buildAvailabilityResult<VehicleAvailabilityReason>(startAt, endAt);

    if (!car.isActive) {
      reasons.push('VEHICLE_INACTIVE');
    }
    if (!car.autoAssignEnabled) {
      reasons.push('AUTO_ASSIGN_DISABLED');
    }
    if (car.vehicleStatus === 'MAINTENANCE') {
      reasons.push('UNDER_MAINTENANCE');
    } else if (car.vehicleStatus === 'OUT_OF_SERVICE') {
      reasons.push('VEHICLE_INACTIVE');
    }
    if (passengerCount !== undefined && passengerCount > car.seatingCapacity) {
      reasons.push('CAPACITY_INSUFFICIENT');
    }

    // Temporal blocks overlapping the requested window (batch count passed in).
    if (overlappingBlockCount > 0) {
      reasons.push('VEHICLE_BLOCKED');
    }

    // Registrations / insurance where recorded.
    if (car.registrationExpiry) {
      const expiryInstant = this.endOfLocalDay(car.registrationExpiry);
      if (expiryInstant.getTime() < startAt.getTime()) {
        reasons.push('REGISTRATION_EXPIRED');
      } else if (expiryInstant.getTime() <= endAt.getTime()) {
        warnings.push('REGISTRATION_EXPIRED');
      }
    }
    if (car.insuranceExpiry) {
      const expiryInstant = this.endOfLocalDay(car.insuranceExpiry);
      if (expiryInstant.getTime() < startAt.getTime()) {
        reasons.push('INSURANCE_EXPIRED');
      } else if (expiryInstant.getTime() <= endAt.getTime()) {
        warnings.push('INSURANCE_EXPIRED');
      }
    }

    // Coding restriction (R2: simple configured coding-day rule; NO holiday or
    // window exemptions — deterministic output from vehicle.codingDay).
    if (
      car.codingDay !== 'NONE' &&
      weekdayNameInPhilippines(startAt) === car.codingDay
    ) {
      reasons.push('CODING_RESTRICTION');
    }

    result.available = reasons.length === 0;
    return result;
  }

  /**
   * Batch block lookup: overlapping blocks grouped per vehicle in ONE query.
   */
  private async findBlocksOverlappingWindow(
    vehicleIds: string[],
    startAt: Date,
    endAt: Date,
  ): Promise<Map<string, number>> {
    if (vehicleIds.length === 0) return new Map();
    const rows = await this.blockRepo
      .createQueryBuilder('b')
      .select('b.vehicleId', 'vehicleId')
      .addSelect('COUNT(*)', 'count')
      .where('b.vehicleId IN (:...vehicleIds)', { vehicleIds })
      .andWhere(
        new Brackets((qb) => {
          qb.where('b.endAt > :startAt', { startAt }).andWhere(
            'b.startAt < :endAt',
            { endAt },
          );
        }),
      )
      .groupBy('b.vehicleId')
      .getRawMany<{ vehicleId: string; count: string }>();
    return new Map(rows.map((row) => [row.vehicleId, Number(row.count)]));
  }

  // ─── Local-time helpers ─────────────────────────────────────────────────────

  /** YYYY-MM-DD of an instant in Asia/Manila. */
  private toLocalYmd(instant: Date): string {
    const shifted = new Date(instant.getTime() + PHILIPPINE_TIME_OFFSET_MS);
    return shifted.toISOString().slice(0, 10);
  }

  /** End-of-day instant (23:59:59.999) of a local YYYY-MM-DD date. */
  private endOfLocalDay(dateYmd: string): Date {
    const [year, month, day] = dateYmd.split('-').map(Number);
    return new Date(
      Date.UTC(year, month - 1, day, 23, 59, 59, 999) -
        PHILIPPINE_TIME_OFFSET_MS,
    );
  }
}

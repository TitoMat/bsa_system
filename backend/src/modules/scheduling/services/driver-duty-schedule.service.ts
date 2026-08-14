import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QueryFailedError } from 'typeorm';
import { Driver } from '../../catalog/drivers/driver.entity';
import { DriverDutySchedule } from '../entities/driver-duty-schedule.entity';
import { CreateDriverDutyScheduleDto } from '../dto/create-driver-duty-schedule.dto';
import { UpdateDriverDutyScheduleDto } from '../dto/update-driver-duty-schedule.dto';
import { QueryDriverDutyScheduleDto } from '../dto/query-driver-duty-schedule.dto';
import {
  resolveScheduleInterval,
  isValidScheduleDate,
} from '../domain/shift-time';
import { normalizePagination } from '../../../common/pagination';
import { AuditService } from '../../../audit/audit.service';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class DriverDutyScheduleService {
  constructor(
    @InjectRepository(DriverDutySchedule)
    private readonly scheduleRepo: Repository<DriverDutySchedule>,
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly auditService: AuditService,
  ) {}

  private validateScheduling(dto: {
    scheduleDate: string;
    shiftStart: string;
    shiftEnd: string;
  }): void {
    if (!isValidScheduleDate(dto.scheduleDate)) {
      throw new BadRequestException(
        `Invalid schedule date: "${dto.scheduleDate}"`,
      );
    }
    try {
      resolveScheduleInterval(dto.scheduleDate, dto.shiftStart, dto.shiftEnd);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid shift interval',
      );
    }
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError &&
      (error as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === UNIQUE_VIOLATION
    );
  }

  async create(
    payload: CreateDriverDutyScheduleDto,
    actor: { sub: string; email: string },
  ) {
    const driver = await this.driverRepo.findOne({
      where: { id: payload.driverId },
    });
    if (!driver) {
      throw new BadRequestException(
        `Driver "${payload.driverId}" does not exist`,
      );
    }

    this.validateScheduling(payload);

    const schedule = this.scheduleRepo.create({
      driverId: payload.driverId,
      scheduleDate: payload.scheduleDate,
      shiftStart: payload.shiftStart,
      shiftEnd: payload.shiftEnd,
      status: payload.status ?? 'ON_DUTY',
      notes: payload.notes ?? null,
      createdByUserId: actor.sub,
    });

    try {
      const saved = await this.scheduleRepo.save(schedule);

      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'CREATE_DRIVER_DUTY_SCHEDULE',
        targetId: saved.id,
        targetType: 'driver_duty_schedule',
        metadata: {
          driverId: saved.driverId,
          scheduleDate: saved.scheduleDate,
        },
      });

      return saved;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          `Driver "${payload.driverId}" already has a duty schedule for ${payload.scheduleDate}`,
        );
      }
      throw error;
    }
  }

  async findAll(query: QueryDriverDutyScheduleDto) {
    const { page, limit, offset: skip } = normalizePagination(query);

    const qb = this.scheduleRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.driver', 'driver')
      .orderBy('s.scheduleDate', 'DESC')
      .addOrderBy('s.shiftStart', 'ASC')
      .skip(skip)
      .take(limit);

    if (query.driverId) {
      qb.andWhere('s.driverId = :driverId', { driverId: query.driverId });
    }
    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }
    if (query.from) {
      qb.andWhere('s.scheduleDate >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('s.scheduleDate <= :to', { to: query.to });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<DriverDutySchedule> {
    const schedule = await this.scheduleRepo.findOne({
      where: { id },
      relations: { driver: true },
    });
    if (!schedule) {
      throw new NotFoundException(`Duty schedule "${id}" not found`);
    }
    return schedule;
  }

  async update(
    id: string,
    payload: UpdateDriverDutyScheduleDto,
    actor: { sub: string; email: string },
  ) {
    const schedule = await this.findOne(id);

    const next = {
      scheduleDate: payload.scheduleDate ?? schedule.scheduleDate,
      shiftStart: payload.shiftStart ?? schedule.shiftStart,
      shiftEnd: payload.shiftEnd ?? schedule.shiftEnd,
    };
    this.validateScheduling(next);

    const target = schedule as unknown as Record<string, unknown>;
    const fields = [
      'scheduleDate',
      'shiftStart',
      'shiftEnd',
      'status',
      'notes',
    ] as const;
    for (const field of fields) {
      const value = payload[field];
      if (value === undefined) continue;
      target[field] = value;
    }

    try {
      const saved = await this.scheduleRepo.save(schedule);

      await this.auditService.log({
        actorId: actor.sub,
        actorEmail: actor.email,
        action: 'UPDATE_DRIVER_DUTY_SCHEDULE',
        targetId: saved.id,
        targetType: 'driver_duty_schedule',
        metadata: { changes: Object.keys(payload) },
      });

      return saved;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          `Driver "${schedule.driverId}" already has a duty schedule for ${next.scheduleDate}`,
        );
      }
      throw error;
    }
  }

  async remove(
    id: string,
    actor: { sub: string; email: string },
  ): Promise<void> {
    const schedule = await this.findOne(id);
    await this.scheduleRepo.delete({ id });

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'DELETE_DRIVER_DUTY_SCHEDULE',
      targetId: id,
      targetType: 'driver_duty_schedule',
      metadata: {
        driverId: schedule.driverId,
        scheduleDate: schedule.scheduleDate,
      },
    });
  }
}

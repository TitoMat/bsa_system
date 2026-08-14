import { Injectable, NotFoundException } from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Driver, type DriverDutyStatus } from './driver.entity';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { DriverQueryDto } from './dto/driver-query.dto';
import { normalizePagination } from '../../../common/pagination';
import { AuditService } from '../../../audit/audit.service';
import {
  DEFAULT_ASSIGNMENT_POOL,
  DEFAULT_AUTO_ASSIGN_ENABLED,
  DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
} from '../fleet-domain';

@Injectable()
export class DriverService {
  constructor(
    @InjectRepository(Driver)
    private readonly driverRepo: Repository<Driver>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: DriverQueryDto) {
    const { page, limit, offset: skip } = normalizePagination(query);

    const qb = this.driverRepo.createQueryBuilder('driver');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('driver.name ILIKE :search', { search })
            .orWhere('driver.licenseNumber ILIKE :search', { search })
            .orWhere('driver.contactNumber ILIKE :search', { search });
        }),
      );
    }

    if (query.status) {
      qb.andWhere('driver.isActive = :isActive', {
        isActive: query.status === 'ACTIVE',
      });
    }

    qb.orderBy('driver.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string) {
    const driver = await this.driverRepo.findOne({ where: { id } });
    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  async create(
    payload: CreateDriverDto,
    actor: { sub: string; email: string },
  ) {
    const driver = this.driverRepo.create({
      name: payload.name,
      licenseNumber: payload.licenseNumber,
      contactNumber: payload.contactNumber ?? null,
      address: payload.address ?? null,
      isActive: payload.isActive ?? true,
      licenseExpiry: payload.licenseExpiry ?? null,
      assignmentPool: payload.assignmentPool ?? DEFAULT_ASSIGNMENT_POOL,
      autoAssignEnabled:
        payload.autoAssignEnabled ?? DEFAULT_AUTO_ASSIGN_ENABLED,
      allowGeneralUseWhenExecutiveAway:
        payload.allowGeneralUseWhenExecutiveAway ??
        DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
      dutyStatus: 'OFF_DUTY' as DriverDutyStatus,
    });
    const saved = await this.driverRepo.save(driver);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'CREATE_DRIVER',
      targetId: saved.id,
      targetType: 'driver',
      metadata: { name: saved.name },
    });

    return saved;
  }

  /**
   * Whitelist of mutable Driver fields. Internal/system-owned fields
   * (id, createdAt, updatedAt, currentLatitude, currentLongitude) are
   * excluded and can never be written through the update DTO.
   */
  private readonly mutableFields = [
    'name',
    'licenseNumber',
    'contactNumber',
    'address',
    'isActive',
    'dutyStatus',
    'licenseExpiry',
    'assignmentPool',
    'autoAssignEnabled',
    'allowGeneralUseWhenExecutiveAway',
  ] as const;

  async update(
    id: string,
    payload: UpdateDriverDto,
    actor: { sub: string; email: string },
  ) {
    const driver = await this.findOne(id);

    const target = driver as unknown as Record<string, unknown>;
    for (const field of this.mutableFields) {
      const value = payload[field];
      if (value === undefined) continue;
      target[field] = value;
    }

    const saved = await this.driverRepo.save(driver);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'UPDATE_DRIVER',
      targetId: saved.id,
      targetType: 'driver',
      metadata: { changes: Object.keys(payload) },
    });

    return saved;
  }

  async delete(id: string, actor: { sub: string; email: string }) {
    const driver = await this.findOne(id);
    await this.driverRepo.remove(driver);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'DELETE_DRIVER',
      targetId: id,
      targetType: 'driver',
      metadata: { name: driver.name },
    });
  }

  async toggleActive(id: string, actor: { sub: string; email: string }) {
    const driver = await this.findOne(id);
    driver.isActive = !driver.isActive;
    const saved = await this.driverRepo.save(driver);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: saved.isActive ? 'ACTIVATE_DRIVER' : 'DEACTIVATE_DRIVER',
      targetId: saved.id,
      targetType: 'driver',
      metadata: { name: saved.name },
    });

    return saved;
  }
}

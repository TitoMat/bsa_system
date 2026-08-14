import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car } from '../../catalog/cars/car.entity';
import { VehicleAvailabilityBlock } from '../entities/vehicle-availability-block.entity';
import { CreateVehicleAvailabilityBlockDto } from '../dto/create-vehicle-availability-block.dto';
import { UpdateVehicleAvailabilityBlockDto } from '../dto/update-vehicle-availability-block.dto';
import { QueryVehicleAvailabilityBlockDto } from '../dto/query-vehicle-availability-block.dto';
import { normalizePagination } from '../../../common/pagination';
import { AuditService } from '../../../audit/audit.service';

@Injectable()
export class VehicleAvailabilityBlockService {
  constructor(
    @InjectRepository(VehicleAvailabilityBlock)
    private readonly blockRepo: Repository<VehicleAvailabilityBlock>,
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    private readonly auditService: AuditService,
  ) {}

  private assertValidInterval(startAt: Date, endAt: Date): void {
    if (endAt.getTime() <= startAt.getTime()) {
      throw new BadRequestException('Block endAt must be after startAt');
    }
  }

  async create(
    payload: CreateVehicleAvailabilityBlockDto,
    actor: { sub: string; email: string },
  ) {
    const car = await this.carRepo.findOne({
      where: { id: payload.vehicleId },
    });
    if (!car) {
      throw new BadRequestException(
        `Vehicle "${payload.vehicleId}" does not exist`,
      );
    }

    const startAt = new Date(payload.startAt);
    const endAt = new Date(payload.endAt);
    this.assertValidInterval(startAt, endAt);

    const block = this.blockRepo.create({
      vehicleId: payload.vehicleId,
      startAt,
      endAt,
      reason: payload.reason,
      notes: payload.notes ?? null,
      createdByUserId: actor.sub,
    });

    const saved = await this.blockRepo.save(block);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'CREATE_VEHICLE_AVAILABILITY_BLOCK',
      targetId: saved.id,
      targetType: 'vehicle_availability_block',
      metadata: { vehicleId: saved.vehicleId, reason: saved.reason },
    });

    return saved;
  }

  async findAll(query: QueryVehicleAvailabilityBlockDto) {
    const { page, limit, offset: skip } = normalizePagination(query);

    const qb = this.blockRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.vehicle', 'vehicle')
      .orderBy('b.startAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.vehicleId) {
      qb.andWhere('b.vehicleId = :vehicleId', { vehicleId: query.vehicleId });
    }
    if (query.reason) {
      qb.andWhere('b.reason = :reason', { reason: query.reason });
    }
    if (query.from) {
      qb.andWhere('b.startAt >= :from', { from: new Date(query.from) });
    }
    if (query.to) {
      qb.andWhere('b.startAt <= :to', { to: new Date(query.to) });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<VehicleAvailabilityBlock> {
    const block = await this.blockRepo.findOne({
      where: { id },
      relations: { vehicle: true },
    });
    if (!block) {
      throw new NotFoundException(`Availability block "${id}" not found`);
    }
    return block;
  }

  async update(
    id: string,
    payload: UpdateVehicleAvailabilityBlockDto,
    actor: { sub: string; email: string },
  ) {
    const block = await this.findOne(id);

    const target = block as unknown as Record<string, unknown>;
    const startAt = new Date(payload.startAt ?? block.startAt.toISOString());
    const endAt = new Date(payload.endAt ?? block.endAt.toISOString());
    this.assertValidInterval(startAt, endAt);

    const fields = ['startAt', 'endAt', 'reason', 'notes'] as const;
    for (const field of fields) {
      const value = payload[field];
      if (value === undefined) continue;
      target[field] =
        field === 'startAt' || field === 'endAt' ? new Date(value) : value;
    }

    const saved = await this.blockRepo.save(block);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'UPDATE_VEHICLE_AVAILABILITY_BLOCK',
      targetId: saved.id,
      targetType: 'vehicle_availability_block',
      metadata: { changes: Object.keys(payload) },
    });

    return saved;
  }

  async remove(
    id: string,
    actor: { sub: string; email: string },
  ): Promise<void> {
    const block = await this.findOne(id);
    await this.blockRepo.delete({ id });

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'DELETE_VEHICLE_AVAILABILITY_BLOCK',
      targetId: id,
      targetType: 'vehicle_availability_block',
      metadata: { vehicleId: block.vehicleId, reason: block.reason },
    });
  }
}

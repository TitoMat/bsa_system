import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Brackets, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Car, type CarType, type VehicleStatus } from './car.entity';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { CarQueryDto } from './dto/car-query.dto';
import { normalizePagination } from '../../../common/pagination';
import { AuditService } from '../../../audit/audit.service';
import {
  DEFAULT_ASSIGNMENT_POOL,
  DEFAULT_AUTO_ASSIGN_ENABLED,
  DEFAULT_CODING_DAY,
  DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
} from '../fleet-domain';

@Injectable()
export class CarService {
  constructor(
    @InjectRepository(Car)
    private readonly carRepo: Repository<Car>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: CarQueryDto) {
    const { page, limit, offset: skip } = normalizePagination(query);

    const qb = this.carRepo.createQueryBuilder('car');

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;
      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('car.make ILIKE :search', { search })
            .orWhere('car.model ILIKE :search', { search })
            .orWhere('car.plateNumber ILIKE :search', { search })
            .orWhere('car.color ILIKE :search', { search });
        }),
      );
    }

    if (query.status) {
      qb.andWhere('car.isActive = :isActive', {
        isActive: query.status === 'ACTIVE',
      });
    }

    qb.orderBy('car.createdAt', 'DESC');
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
    const car = await this.carRepo.findOne({ where: { id } });
    if (!car) throw new NotFoundException('Car not found');
    return car;
  }

  private getPhotoDir(): string {
    const storageRoot =
      process.env.BSA_STORAGE_ROOT ||
      process.env.STORAGE_ROOT ||
      path.join(process.cwd(), 'storage');
    return path.join(storageRoot, 'cars');
  }

  async create(
    payload: CreateCarDto,
    file: Express.Multer.File | undefined,
    actor: { sub: string; email: string },
  ) {
    const car = this.carRepo.create({
      make: payload.make,
      model: payload.model,
      year: payload.year ?? null,
      plateNumber: payload.plateNumber,
      color: payload.color ?? null,
      carType: (payload.carType ?? 'Other') as CarType,
      isActive: payload.isActive ?? true,
      seatingCapacity: payload.seatingCapacity ?? 5,
      vehicleStatus: payload.vehicleStatus ?? 'OPERATIONAL',
      registrationExpiry: payload.registrationExpiry ?? null,
      insuranceExpiry: payload.insuranceExpiry ?? null,
      codingDay: payload.codingDay ?? DEFAULT_CODING_DAY,
      assignmentPool: payload.assignmentPool ?? DEFAULT_ASSIGNMENT_POOL,
      autoAssignEnabled:
        payload.autoAssignEnabled ?? DEFAULT_AUTO_ASSIGN_ENABLED,
      allowGeneralUseWhenExecutiveAway:
        payload.allowGeneralUseWhenExecutiveAway ??
        DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY,
    });

    if (file) {
      this.validatePhoto(file);
    }

    const saved = await this.carRepo.save(car);

    if (file) {
      saved.photoUrl = this.savePhoto(saved.id, file);
      await this.carRepo.save(saved);
    }

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'CREATE_CAR',
      targetId: saved.id,
      targetType: 'car',
      metadata: {
        make: saved.make,
        model: saved.model,
        plateNumber: saved.plateNumber,
      },
    });

    return saved;
  }

  /**
   * Whitelist of mutable Car fields. Internal/system-owned fields
   * (id, photoUrl — managed only through file upload —, createdAt,
   * updatedAt) are excluded and can never be written through the update DTO.
   */
  private readonly mutableFields = [
    'make',
    'model',
    'year',
    'plateNumber',
    'color',
    'carType',
    'isActive',
    'seatingCapacity',
    'vehicleStatus',
    'registrationExpiry',
    'insuranceExpiry',
    'codingDay',
    'assignmentPool',
    'autoAssignEnabled',
    'allowGeneralUseWhenExecutiveAway',
  ] as const;

  async update(
    id: string,
    payload: UpdateCarDto,
    file: Express.Multer.File | undefined,
    actor: { sub: string; email: string },
  ) {
    const car = await this.findOne(id);

    if (file) {
      this.validatePhoto(file);
      this.deletePhoto(car.photoUrl);
      car.photoUrl = this.savePhoto(id, file);
    }

    const target = car as unknown as Record<string, unknown>;
    for (const field of this.mutableFields) {
      const value = payload[field];
      if (value === undefined) continue;
      target[field] = value;
    }

    const saved = await this.carRepo.save(car);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'UPDATE_CAR',
      targetId: saved.id,
      targetType: 'car',
      metadata: { changes: Object.keys(payload) },
    });

    return saved;
  }

  getPhotoPath(carId: string): string | null {
    const dir = this.getPhotoDir();
    const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
    const match = files.find((f) => f.startsWith(carId + '.'));
    if (!match) return null;
    return path.join(dir, match);
  }

  private validatePhoto(file: Express.Multer.File) {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG, JPEG, and WebP images are allowed',
      );
    }
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Photo must be 5MB or less');
    }
  }

  private savePhoto(carId: string, file: Express.Multer.File): string {
    const ext = path.extname(file.originalname) || '.png';
    const dir = this.getPhotoDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const fileName = `${carId}${ext}`;
    const filePath = path.join(dir, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `/api/cars/${carId}/photo`;
  }

  private deletePhoto(photoUrl: string | null) {
    if (!photoUrl) return;
    try {
      const carId = photoUrl.split('/')[3]; // /api/cars/{id}/photo
      const dir = this.getPhotoDir();
      const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
      for (const f of files) {
        if (f.startsWith(carId + '.')) {
          fs.unlinkSync(path.join(dir, f));
          break;
        }
      }
    } catch {
      // ignore deletion errors
    }
  }

  async delete(id: string, actor: { sub: string; email: string }) {
    const car = await this.findOne(id);
    this.deletePhoto(car.photoUrl);
    await this.carRepo.remove(car);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'DELETE_CAR',
      targetId: id,
      targetType: 'car',
      metadata: {
        make: car.make,
        model: car.model,
        plateNumber: car.plateNumber,
      },
    });
  }
}

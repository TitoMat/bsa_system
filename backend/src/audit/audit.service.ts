// backend/src/audit/audit.service.ts
import { Injectable } from '@nestjs/common';
import { Brackets, EntityManager, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';
import { normalizePagination } from '../common/pagination';

type LogPayload = {
  actorId: string;
  actorEmail: string;
  action: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, any>;
};

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(
    payload: LogPayload,
    manager?: EntityManager,
    options: { required?: boolean } = {},
  ) {
    try {
      const repo = manager?.getRepository(AuditLog) ?? this.repo;
      const log = repo.create(payload);
      return await repo.save(log);
    } catch (error) {
      console.error('[AUDIT] failed:', error);
      if (options.required) throw error;
    }
  }

  private buildFilterQuery(query: AuditLogQueryDto) {
    const qb = this.repo.createQueryBuilder('log');

    if (query.search) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('log.actorEmail ILIKE :search', { search })
            .orWhere('log.action ILIKE :search', { search })
            .orWhere('log.targetId ILIKE :search', { search })
            .orWhere('log.targetType ILIKE :search', { search });
        }),
      );
    }

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    if (query.actorEmail) {
      qb.andWhere('log.actorEmail ILIKE :actorEmail', {
        actorEmail: `%${query.actorEmail.trim()}%`,
      });
    }

    if (query.targetType) {
      qb.andWhere('log.targetType = :targetType', {
        targetType: query.targetType,
      });
    }

    if (query.dateFrom) {
      qb.andWhere('log.createdAt >= :dateFrom', {
        dateFrom: new Date(query.dateFrom),
      });
    }

    if (query.dateTo) {
      qb.andWhere('log.createdAt <= :dateTo', {
        dateTo: new Date(`${query.dateTo}T23:59:59.999Z`),
      });
    }

    qb.orderBy('log.createdAt', query.order ?? 'DESC');
    return qb;
  }

  async findAll(query: AuditLogQueryDto) {
    const { page, limit, offset: skip } = normalizePagination(query);
    const qb = this.buildFilterQuery(query);
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

  async exportCsv(query: AuditLogQueryDto): Promise<string> {
    const qb = this.buildFilterQuery(query);
    const items = await qb.getMany();

    const header =
      'ID,Actor ID,Actor Email,Action,Target Type,Target ID,Metadata,Created At';
    const rows = items.map((log) => {
      const meta = log.metadata
        ? JSON.stringify(log.metadata).replace(/"/g, '""')
        : '';
      return [
        log.id,
        log.actorId,
        log.actorEmail,
        log.action,
        log.targetType || '',
        log.targetId || '',
        meta,
        log.createdAt.toISOString(),
      ]
        .map((v) => `"${v}"`)
        .join(',');
    });

    return [header, ...rows].join('\n');
  }
}

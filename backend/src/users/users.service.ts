// backend/src/users/users.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Not, Repository } from 'typeorm';

import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangeUserStatusDto } from './dto/change-user-status.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UnlockUserDto } from './dto/unlock-user.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { AuditService } from '../audit/audit.service';
import { normalizePagination } from '../common/pagination';
import { PermissionsService } from '../permissions/permissions.service';

type AuditActor = {
  sub: string;
  email: string;
  name?: string;
  role: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly auditService: AuditService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(query: UserListQueryDto) {
    const { page, limit, offset: skip } = normalizePagination(query);

    const qb = this.usersRepository.createQueryBuilder('user');

    qb.select([
      'user.id',
      'user.name',
      'user.email',
      'user.role',
      'user.isActive',
      'user.failedLoginAttempts',
      'user.lockedUntil',
      'user.mustChangePassword',
      'user.avatarUrl',
      'user.createdAt',
      'user.updatedAt',
    ]);

    if (query.search?.trim()) {
      const search = `%${query.search.trim()}%`;

      qb.andWhere(
        new Brackets((subQb) => {
          subQb
            .where('user.name ILIKE :search', { search })
            .orWhere('user.email ILIKE :search', { search });
        }),
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.status) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: query.status === 'ACTIVE',
      });
    }

    qb.orderBy('user.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        mustChangePassword: user.mustChangePassword,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        failedLoginAttempts: true,
        lockedUntil: true,
        mustChangePassword: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async create(payload: CreateUserDto, actor: AuditActor) {
    const existing = await this.usersRepository.findOne({
      where: { email: payload.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email already exists');
    }

    await this.assertRoleExists(payload.role);

    const user = this.usersRepository.create({
      name: payload.name,
      email: payload.email.toLowerCase(),
      password: payload.password,
      role: payload.role,
      isActive: payload.isActive ?? true,
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? 'UNKNOWN',
      actorEmail: actor?.email ?? 'unknown@local',
      action: 'CREATE_USER',
      targetId: saved.id,
      targetType: 'USER',
      metadata: {
        email: saved.email,
        role: saved.role,
        isActive: saved.isActive,
        mustChangePassword: saved.mustChangePassword,
      },
    });

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      isActive: saved.isActive,
      failedLoginAttempts: saved.failedLoginAttempts,
      lockedUntil: saved.lockedUntil,
      mustChangePassword: saved.mustChangePassword,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async update(id: string, payload: UpdateUserDto, actor: AuditActor) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (payload.email) {
      const existing = await this.usersRepository.findOne({
        where: {
          email: payload.email.toLowerCase(),
          id: Not(id),
        },
      });

      if (existing) {
        throw new BadRequestException('Email already exists');
      }

      user.email = payload.email.toLowerCase();
    }

    if (payload.name !== undefined) user.name = payload.name;
    if (payload.role !== undefined) {
      await this.assertRoleExists(payload.role);
      user.role = payload.role;
    }

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? 'UNKNOWN',
      actorEmail: actor?.email ?? 'unknown@local',
      action: 'UPDATE_USER',
      targetId: saved.id,
      targetType: 'USER',
      metadata: {
        email: saved.email,
        role: saved.role,
        isActive: saved.isActive,
        mustChangePassword: saved.mustChangePassword,
      },
    });

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      isActive: saved.isActive,
      failedLoginAttempts: saved.failedLoginAttempts,
      lockedUntil: saved.lockedUntil,
      mustChangePassword: saved.mustChangePassword,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async changeStatus(
    id: string,
    payload: ChangeUserStatusDto,
    actor: AuditActor,
  ) {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (actor?.sub === id && payload.isActive === false) {
      throw new BadRequestException('You cannot deactivate your own account.');
    }

    user.isActive = payload.isActive;

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? 'UNKNOWN',
      actorEmail: actor?.email ?? 'unknown@local',
      action: saved.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      targetId: saved.id,
      targetType: 'USER',
      metadata: {
        email: saved.email,
        role: saved.role,
        isActive: saved.isActive,
      },
    });

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      role: saved.role,
      isActive: saved.isActive,
      failedLoginAttempts: saved.failedLoginAttempts,
      lockedUntil: saved.lockedUntil,
      mustChangePassword: saved.mustChangePassword,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }

  async resetPassword(
    id: string,
    payload: ResetPasswordDto,
    actor: AuditActor,
  ) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = payload.newPassword;
    user.mustChangePassword = true;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    const saved = await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? 'UNKNOWN',
      actorEmail: actor?.email ?? 'unknown@local',
      action: 'RESET_PASSWORD',
      targetId: saved.id,
      targetType: 'USER',
      metadata: {
        email: saved.email,
        role: saved.role,
        isActive: saved.isActive,
        mustChangePassword: saved.mustChangePassword,
      },
    });

    return {
      success: true,
    };
  }

  async unlockUser(id: string, payload: UnlockUserDto, actor: AuditActor) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.password = payload.newPassword;
    user.isActive = true;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.mustChangePassword = true;

    await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? 'UNKNOWN',
      actorEmail: actor?.email ?? 'unknown@local',
      action: 'ACCOUNT_RESET_AND_UNLOCK',
      targetId: user.id,
      targetType: 'USER',
      metadata: {
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
      },
    });

    return this.findOne(id);
  }

  private async assertRoleExists(role: string) {
    if (!(await this.permissionsService.roleExists(role))) {
      throw new BadRequestException('Role does not exist.');
    }
  }
}

// backend/src/auth/auth.service.ts
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { User } from '../users/user.entity';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../common/redis/redis.service';
import { PermissionsService } from '../permissions/permissions.service';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
    private readonly redisService: RedisService,
    private readonly permissionsService: PermissionsService,
  ) {}

  async login(payload: LoginDto) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('LOWER(user.email) = LOWER(:email)', { email: payload.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Auto-clear expired lock
    if (
      user.lockedUntil &&
      new Date(user.lockedUntil).getTime() <= Date.now()
    ) {
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
      await this.usersRepository.save(user);
    }

    // Block active lock
    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      throw new UnauthorizedException(
        'Account is locked due to multiple failed login attempts. Please contact an administrator.',
      );
    }

    const passwordMatched = await user.comparePassword(payload.password);

    if (!passwordMatched) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;

      await this.auditService.log({
        actorId: user.id,
        actorEmail: user.email,
        action: 'LOGIN_FAILED',
        targetId: user.id,
        targetType: 'USER',
        metadata: {
          failedLoginAttempts: user.failedLoginAttempts,
        },
      });

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(
          Date.now() + LOCK_DURATION_MINUTES * 60 * 1000,
        );

        user.lockedUntil = lockedUntil;
        await this.usersRepository.save(user);

        await this.auditService.log({
          actorId: user.id,
          actorEmail: user.email,
          action: 'ACCOUNT_LOCKED',
          targetId: user.id,
          targetType: 'USER',
          metadata: {
            failedLoginAttempts: user.failedLoginAttempts,
            lockedUntil: lockedUntil.toISOString(),
          },
        });

        throw new UnauthorizedException(
          'Account is locked due to multiple failed login attempts. Please contact an administrator.',
        );
      }

      await this.usersRepository.save(user);
      throw new UnauthorizedException('Invalid email or password');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'LOGIN_SUCCESS',
      targetId: user.id,
      targetType: 'USER',
    });

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const token = await this.jwtService.signAsync(tokenPayload);

    const permissions = await this.permissionsService.getEffectivePermissions(
      user.id,
      user.role,
    );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions,
        isActive: user.isActive,
        mustChangePassword: user.mustChangePassword,
        themePreference: user.themePreference,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /** Re-issue a JWT for a user with a still-valid token (sliding session).
   *  Uses fresh user state from the DB so role/status changes take effect
   *  on the next token even before the original expires.
   */
  async refreshToken(userId: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unauthorized');
    }

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const token = await this.jwtService.signAsync(tokenPayload);

    await this.auditService.log({
      actorId: user.id,
      actorEmail: user.email,
      action: 'TOKEN_REFRESHED',
      targetId: user.id,
      targetType: 'USER',
    });

    return { token };
  }

  async updateTheme(userId: string, themePreference: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    user.themePreference = themePreference;
    await this.usersRepository.save(user);
    return { themePreference: user.themePreference };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (dto.employeeId !== undefined) user.employeeId = dto.employeeId || null;
    if (dto.phone !== undefined) user.phone = dto.phone || null;
    if (dto.department !== undefined) user.department = dto.department || null;
    if (dto.position !== undefined) user.position = dto.position || null;
    await this.usersRepository.save(user);
    return { ok: true };
  }

  private getAvatarDir(): string {
    const storageRoot =
      process.env.BSA_STORAGE_ROOT ||
      process.env.STORAGE_ROOT ||
      path.join(process.cwd(), 'storage');
    return path.join(storageRoot, 'avatars');
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Only PNG, JPEG, and WebP images are allowed',
      );
    }

    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      throw new BadRequestException('Avatar must be 2MB or less');
    }

    const ext = path.extname(file.originalname) || '.png';
    const avatarDir = this.getAvatarDir();
    if (!fs.existsSync(avatarDir)) {
      fs.mkdirSync(avatarDir, { recursive: true });
    }

    const fileName = `${userId}${ext}`;
    const filePath = path.join(avatarDir, fileName);
    fs.writeFileSync(filePath, file.buffer);

    const avatarUrl = `/api/auth/avatar/${userId}`;
    await this.usersRepository.update(userId, { avatarUrl });

    return { avatarUrl };
  }

  async getAvatarStream(
    userId: string,
  ): Promise<{ stream: fs.ReadStream; ext: string } | null> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user?.avatarUrl) return null;

    const avatarDir = this.getAvatarDir();
    const files = fs.readdirSync(avatarDir).filter((f) => f.startsWith(userId));
    if (files.length === 0) return null;

    const fileName = files[0];
    const ext = path.extname(fileName);
    const filePath = path.join(avatarDir, fileName);
    if (!fs.existsSync(filePath)) return null;

    const stream = fs.createReadStream(filePath);
    return { stream, ext };
  }

  async findUserById(id: string) {
    return this.usersRepository.findOne({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
        themePreference: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(
    userId: string,
    payload: ChangePasswordDto,
    actor?: { sub: string; email: string },
  ) {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Unauthorized');
    }

    const passwordMatched = await user.comparePassword(payload.currentPassword);

    if (!passwordMatched) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (payload.currentPassword === payload.newPassword) {
      throw new BadRequestException('New password must be different');
    }

    user.password = payload.newPassword;
    user.mustChangePassword = false;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.usersRepository.save(user);

    await this.auditService.log({
      actorId: actor?.sub ?? user.id,
      actorEmail: actor?.email ?? user.email,
      action: 'CHANGE_PASSWORD',
      targetId: user.id,
      targetType: 'USER',
    });

    return {
      success: true,
    };
  }

  async logout(token: string): Promise<void> {
    const decoded = this.jwtService.decode(token);
    if (!decoded || !decoded.exp) return;

    const nowInSeconds = Math.floor(Date.now() / 1000);
    const ttl = Math.max(0, decoded.exp - nowInSeconds);
    if (ttl <= 0) return;

    const hash = createHash('sha256').update(token).digest('hex');
    const redis = this.redisService.getClient();
    await redis.set(`token_blocklist:${hash}`, '1', 'EX', ttl);
  }
}

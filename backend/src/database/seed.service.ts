import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const email = this.configService.get<string>('SUPERADMIN_EMAIL');
      const password = this.configService.get<string>('SUPERADMIN_PASSWORD');
      const name =
        this.configService.get<string>('SUPERADMIN_NAME') || 'Super Admin';

      if (!email || !password) {
        this.logger.warn(
          'Super admin seed skipped: missing SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD',
        );
        return;
      }

      const existing = await this.usersRepository.findOne({
        where: { email },
      });

      if (existing) {
        this.logger.log(`Super admin already exists: ${email}`);
        return;
      }

      const user = this.usersRepository.create({
        name,
        email: email.toLowerCase(),
        password,
        role: Role.SUPERADMIN,
        isActive: true,
      });

      await this.usersRepository.save(user);

      this.logger.log(`Seeded super admin: ${email}`);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as QueryFailedError & { code?: string }).code === '42P01'
      ) {
        this.logger.warn(
          'Super admin seed skipped: users table is missing. Run database migrations before starting the backend.',
        );
        return;
      }

      throw error;
    }
  }
}

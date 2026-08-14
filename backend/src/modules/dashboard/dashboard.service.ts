import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RedisService } from '../../common/redis/redis.service';

export type ServiceStatus = 'OPERATIONAL' | 'UNAVAILABLE';

export interface SystemStatusService {
  key: string;
  label: string;
  status: ServiceStatus;
}

export interface SystemStatus {
  status: 'OPERATIONAL' | 'DEGRADED';
  checkedAt: string;
  services: SystemStatusService[];
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {}

  async getSystemStatus(): Promise<SystemStatus> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const services: SystemStatusService[] = [
      { key: 'database', label: 'Database', status: database },
      { key: 'redis', label: 'Redis', status: redis },
      { key: 'api', label: 'API', status: 'OPERATIONAL' },
    ];

    return {
      status: services.some((service) => service.status === 'UNAVAILABLE')
        ? 'DEGRADED'
        : 'OPERATIONAL',
      checkedAt: new Date().toISOString(),
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'OPERATIONAL';
    } catch (error) {
      this.logger.error(
        `Database health check failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 'UNAVAILABLE';
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    try {
      const result = await this.redisService.client.ping();
      return result === 'PONG' ? 'OPERATIONAL' : 'UNAVAILABLE';
    } catch (error) {
      this.logger.error(
        `Redis health check failed: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      return 'UNAVAILABLE';
    }
  }
}
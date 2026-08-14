import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { PermissionsModule } from '../../permissions/permissions.module';
import { RedisService } from '../../common/redis/redis.service';

@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    JwtAuthGuard,
    PermissionsGuard,
    RedisService,
  ],
  imports: [PermissionsModule],
})
export class DashboardModule {}

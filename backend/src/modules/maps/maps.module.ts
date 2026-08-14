import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../permissions/permissions.guard';
import { PermissionsModule } from '../../permissions/permissions.module';
import { MapsRateLimitGuard } from './guards/maps-rate-limit.guard';
import { RedisService } from '../../common/redis/redis.service';

@Module({
  controllers: [MapsController],
  providers: [
    MapsService,
    JwtAuthGuard,
    PermissionsGuard,
    MapsRateLimitGuard,
    RedisService,
  ],
  imports: [PermissionsModule],
  exports: [MapsService],
})
export class MapsModule {}

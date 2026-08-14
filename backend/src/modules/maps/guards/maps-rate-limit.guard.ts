// backend/src/modules/maps/guards/maps-rate-limit.guard.ts
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../../common/redis/redis.service';
import { resolveClientIp } from '../../../common/security/resolve-client-ip';

const MAPS_RATE_LIMIT_WINDOW_SECONDS = 300; // 5 minutes
const MAPS_ROUTE_RATE_LIMIT_MAX_REQUESTS = 10; // 10 route requests per 5 minutes
const MAPS_SEARCH_RATE_LIMIT_MAX_REQUESTS = 60; // 60 search requests per 5 minutes

function isRateLimitFailClosed(): boolean {
  const override = process.env.RATE_LIMIT_FAIL_CLOSED;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

@Injectable()
export class MapsRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(MapsRateLimitGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const path = request.route?.path || request.path;

    const key = path.includes('/route')
      ? `maps_route:${ip}`
      : `maps_requests:${ip}`;
    const maxRequests = path.includes('/route')
      ? MAPS_ROUTE_RATE_LIMIT_MAX_REQUESTS
      : MAPS_SEARCH_RATE_LIMIT_MAX_REQUESTS;

    try {
      const redis = this.redisService.getClient();
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, MAPS_RATE_LIMIT_WINDOW_SECONDS);
      }
      if (count > maxRequests) {
        throw new HttpException(
          'Too many map requests. Please try again later.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (isRateLimitFailClosed()) {
        throw new HttpException(
          'Service temporarily unavailable. Please try again later.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      this.logger.warn('Maps rate limit check skipped: Redis is unavailable');
    }

    return true;
  }

  private getClientIp(request: any): string {
    return resolveClientIp(request);
  }
}

// backend/src/auth/guards/login-rate-limit.guard.ts
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { resolveClientIp } from '../../common/security/resolve-client-ip';

const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 60;
const LOGIN_RATE_LIMIT_MAX_REQUESTS = 5;

function isRateLimitFailClosed(): boolean {
  const override = process.env.RATE_LIMIT_FAIL_CLOSED;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return process.env.NODE_ENV === 'production';
}

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(LoginRateLimitGuard.name);

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const key = `login_attempts:${ip}`;

    try {
      const redis = this.redisService.getClient();
      const attempts = await redis.incr(key);

      if (attempts === 1) {
        await redis.expire(key, LOGIN_RATE_LIMIT_WINDOW_SECONDS);
      }

      if (attempts > LOGIN_RATE_LIMIT_MAX_REQUESTS) {
        throw new HttpException(
          'Too many login attempts. Please try again later.',
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

      this.logger.warn('Login rate limit check skipped: Redis is unavailable');
    }

    return true;
  }

  private getClientIp(request: any): string {
    return resolveClientIp(request);
  }
}

import {
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { createHash } from 'node:crypto';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly redisService: RedisService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const parentResult = await super.canActivate(context);
    if (!parentResult) return false;

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string> }>();
    const authHeader = request.headers?.authorization;

    if (!authHeader) return true;

    const token = authHeader.replace('Bearer ', '');
    const hash = createHash('sha256').update(token).digest('hex');

    try {
      const redis = this.redisService.getClient();
      const isBlocklisted = await redis.get(`token_blocklist:${hash}`);

      if (isBlocklisted) {
        throw new UnauthorizedException(
          'Token has been revoked. Please log in again.',
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;

      this.logger.warn('Token blocklist check skipped: Redis unavailable');
    }

    return true;
  }
}

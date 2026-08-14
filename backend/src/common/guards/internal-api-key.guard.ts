import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expectedKey = process.env.BSA_INTERNAL_API_KEY?.trim();

    if (!expectedKey) {
      throw new UnauthorizedException('Internal API key is not configured.');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const headerValue = request.header('x-internal-api-key')?.trim() ?? '';

    if (!headerValue) {
      throw new UnauthorizedException('Invalid internal API key.');
    }

    const expectedBuf = Buffer.from(expectedKey, 'utf8');
    const headerBuf = Buffer.from(headerValue, 'utf8');
    const valid =
      expectedBuf.length === headerBuf.length &&
      timingSafeEqual(expectedBuf, headerBuf);

    if (!valid) {
      throw new UnauthorizedException('Invalid internal API key.');
    }

    return true;
  }
}

// backend/src/modules/maps/guards/maps-rate-limit.guard.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MapsRateLimitGuard } from './maps-rate-limit.guard';
import { RedisService } from '../../../common/redis/redis.service';

const mockRedisClient = {
  incr: jest.fn(),
  expire: jest.fn(),
};

const mockRedisService = {
  getClient: jest.fn().mockReturnValue(mockRedisClient),
};

describe('MapsRateLimitGuard', () => {
  let guard: MapsRateLimitGuard;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MapsRateLimitGuard,
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    guard = module.get<MapsRateLimitGuard>(MapsRateLimitGuard);
  });

  const mockContext = (path: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ route: { path }, headers: {}, socket: {} }),
      }),
    }) as any;

  it('allows requests within the search limit', async () => {
    mockRedisClient.incr.mockResolvedValueOnce(5);

    await expect(guard.canActivate(mockContext('/maps/search'))).resolves.toBe(
      true,
    );
    expect(mockRedisClient.expire).not.toHaveBeenCalled();
  });

  it('sets expiry on first request in window', async () => {
    mockRedisClient.incr.mockResolvedValueOnce(1);

    await expect(guard.canActivate(mockContext('/maps/search'))).resolves.toBe(
      true,
    );
    expect(mockRedisClient.expire).toHaveBeenCalled();
  });

  it('blocks requests exceeding the route limit', async () => {
    mockRedisClient.incr.mockResolvedValueOnce(11);

    await expect(guard.canActivate(mockContext('/maps/route'))).rejects.toThrow(
      new HttpException(
        'Too many map requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
  });

  it('allows requests when Redis is unavailable (fail open in dev)', async () => {
    mockRedisService.getClient.mockImplementation(() => {
      throw new Error('Redis connection failed');
    });

    await expect(guard.canActivate(mockContext('/maps/search'))).resolves.toBe(
      true,
    );
  });
});

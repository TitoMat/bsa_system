import { RedisOptions } from 'ioredis';

export function createRedisConnectionOptions(): RedisOptions {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}

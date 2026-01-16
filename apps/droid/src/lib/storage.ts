import type { Redis } from '@upstash/redis';
import type { StorageAdapter } from 'grammy';

export class UpstashAdapter<T> implements StorageAdapter<T> {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async read(key: string) {
    const value = await this.redis.get<T>(key);
    return value || undefined;
  }

  async write(key: string, value: T) {
    await this.redis.set(key, value);
  }

  async delete(key: string) {
    await this.redis.del(key);
  }
}

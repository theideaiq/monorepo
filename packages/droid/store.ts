/**
 * The small key-value store the bot keeps short-lived state in: AI chat
 * history, flood counters, pending prompts ("send your unban request") and
 * cached chat settings. Every key expires. Production uses Upstash Redis over
 * REST (serverless friendly); tests use the in-memory store.
 */
import type { Redis } from "@upstash/redis";

export interface KeyValueStore {
  delete: (key: string) => Promise<void>;
  get: <T>(key: string) => Promise<T | undefined>;
  /** Increments a counter, starting its expiry on the first increment. */
  increment: (key: string, ttlSeconds: number) => Promise<number>;
  set: <T>(key: string, value: T, ttlSeconds: number) => Promise<void>;
}

/** Redis-backed store. Values are JSON-serialised by the Upstash client. */
export const createUpstashStore = (
  redis: Pick<Redis, "del" | "expire" | "get" | "incr" | "set">,
  prefix = "droid:"
): KeyValueStore => ({
  async delete(key) {
    await redis.del(prefix + key);
  },
  async get<T>(key: string) {
    const value = await redis.get<T>(prefix + key);
    return value ?? undefined;
  },
  async increment(key, ttlSeconds) {
    const count = await redis.incr(prefix + key);
    if (count === 1) {
      await redis.expire(prefix + key, ttlSeconds);
    }
    return count;
  },
  async set(key, value, ttlSeconds) {
    await redis.set(prefix + key, value, { ex: ttlSeconds });
  },
});

/** In-memory store for tests and local development. */
export const createMemoryStore = (
  now: () => number = Date.now
): KeyValueStore & { size: () => number } => {
  const entries = new Map<string, { expiresAt: number; value: unknown }>();

  const read = (key: string) => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt <= now()) {
      entries.delete(key);
      return;
    }
    return entry;
  };

  return {
    delete(key) {
      entries.delete(key);
      return Promise.resolve();
    },
    get<T>(key: string) {
      // Round-trip through JSON like Redis does, so tests catch values that
      // don't survive serialisation.
      const entry = read(key);
      return Promise.resolve(
        entry ? (JSON.parse(JSON.stringify(entry.value)) as T) : undefined
      );
    },
    increment(key, ttlSeconds) {
      const entry = read(key);
      const count = ((entry?.value as number | undefined) ?? 0) + 1;
      entries.set(key, {
        expiresAt: entry?.expiresAt ?? now() + ttlSeconds * 1000,
        value: count,
      });
      return Promise.resolve(count);
    },
    set(key, value, ttlSeconds) {
      entries.set(key, { expiresAt: now() + ttlSeconds * 1000, value });
      return Promise.resolve();
    },
    size: () => entries.size,
  };
};

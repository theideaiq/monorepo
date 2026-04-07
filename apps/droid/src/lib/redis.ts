import { droidEnv as env } from '@repo/env/droid';
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL || 'https://placeholder-url.upstash.io',
  token: env.UPSTASH_REDIS_REST_TOKEN || 'placeholder-token',
});

import { Redis } from '@upstash/redis';
import { env } from '../env';

const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env;

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  throw new Error(
    'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required',
  );
}

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});

import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const droidEnv = createEnv({
  server: {
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    WAYL_SECRET_KEY: z.string().min(1),
    WAYL_WEBHOOK_SECRET: z.string().min(1),
    WEB_APP_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  runtimeEnv: {
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    WAYL_SECRET_KEY: process.env.WAYL_SECRET_KEY,
    WAYL_WEBHOOK_SECRET: process.env.WAYL_WEBHOOK_SECRET,
    WEB_APP_URL: process.env.WEB_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === 'lint' ||
    process.env.npm_lifecycle_event === 'format' ||
    process.env.npm_lifecycle_event === 'check' ||
    process.env.npm_lifecycle_event === 'typecheck' ||
    process.env.npm_lifecycle_event === 'test' ||
    process.env.npm_lifecycle_event === 'build',
});

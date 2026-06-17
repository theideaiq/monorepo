import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const adminEnv = createEnv({
  server: {
    RESEND_API_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    WAYL_SECRET_KEY: z.string().min(1),
    WAYL_WEBHOOK_SECRET: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    WAYL_SECRET_KEY: process.env.WAYL_SECRET_KEY,
    WAYL_WEBHOOK_SECRET: process.env.WAYL_WEBHOOK_SECRET,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
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

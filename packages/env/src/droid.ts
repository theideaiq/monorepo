import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Environment variable schema for the Droid (Telegram Bot) application.
 * Primarily server-side as it runs as a Node.js process/serverless function.
 */
export const droidEnv = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    /** Telegram Bot API Token */
    TELEGRAM_BOT_TOKEN: z.string().min(1).default('dummy:token'),
    /** Google Gemini AI API Key */
    GEMINI_API_KEY: z.string().min(1).default('dummy'),
    /** Supabase Service Role Key */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).default('dummy'),
    /** Upstash Redis Connection URL */
    UPSTASH_REDIS_REST_URL: z.string().url().default('https://dummy.upstash.io'),
    /** Upstash Redis Auth Token */
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1).default('dummy'),
    /** Wayl Payment Gateway API Key (X-WAYL-AUTHENTICATION) */
    WAYL_SECRET_KEY: z.string().min(1).default('dummy'),
    /** Wayl Webhook Secret */
    WAYL_WEBHOOK_SECRET: z.string().min(1).default('dummy'),
    /** Public URL of the Web App (for redirects) */
    WEB_APP_URL: z.string().url().default('https://dummy.com'),
  },
  client: {
    /** Supabase Project URL */
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    /** Supabase Anon Key */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy',
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION || process.env.NODE_ENV === 'test' || process.env.CI === 'true',
  emptyStringAsUndefined: true,
});

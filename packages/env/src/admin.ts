import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Environment variable schema for the Admin application.
 * Validates variables at build time (client) and runtime (server).
 */
export const adminEnv = createEnv({
  server: {
    /** Node environment */
    NODE_ENV: z.enum(['development', 'test', 'production']),
    /** Resend API Key for email services */
    RESEND_API_KEY: z.string().min(1),
    /** Supabase Service Role Key (Admin privileges) - NEVER expose to client */
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    /** Wayl Payment Gateway API Key (X-WAYL-AUTHENTICATION) */
    WAYL_SECRET_KEY: z.string().min(1),
    /** Wayl Webhook Secret for signature verification */
    WAYL_WEBHOOK_SECRET: z.string().min(1),
  },
  client: {
    /** Supabase Project URL */
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    /** Supabase Anon Key (Public) */
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    /** Application Environment context */
    NEXT_PUBLIC_APP_ENV: z
      .enum(['local', 'staging', 'production', 'mobile'])
      .default('local'),
    /**
     * Canonical Site URL.
     * Used for constructing absolute URLs for metadata, emails, etc.
     */
    NEXT_PUBLIC_SITE_URL: z.string().url(),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
    // Vercel specific fallback: When on Vercel, VERCEL_URL is automatically set but lacks 'https://'.
    // We prefer the explicit NEXT_PUBLIC_SITE_URL if available.
    NEXT_PUBLIC_SITE_URL:
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3001'),
  },
  skipValidation:
    !!process.env.SKIP_ENV_VALIDATION ||
    process.env.npm_lifecycle_event === 'lint',
  emptyStringAsUndefined: true,
});

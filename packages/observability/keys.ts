import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Public and build-time values only, so every app may use this preset. The
// Better Stack API token (status badge) is in ./status/keys, read by
// apps/api only.
export const keys = () =>
  createEnv({
    client: {
      // Added by Sentry Integration, Vercel Marketplace
      NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),
    },
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
      SENTRY_ORG: process.env.SENTRY_ORG,
      SENTRY_PROJECT: process.env.SENTRY_PROJECT,
    },
    server: {
      // Added by Sentry Integration, Vercel Marketplace (source map upload
      // at build time; slugs, not secrets).
      SENTRY_ORG: z.string().optional(),
      SENTRY_PROJECT: z.string().optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

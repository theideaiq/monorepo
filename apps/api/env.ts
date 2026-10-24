import { keys as ai } from "@repo/ai/keys";
import { keys as analytics } from "@repo/analytics/conversions/keys";
import { keys as auth } from "@repo/auth/keys";
import { keys as database } from "@repo/database/keys";
import { keys as droid } from "@repo/droid/keys";
import { keys as email } from "@repo/email/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { keys as status } from "@repo/observability/status/keys";
import { keys as payments } from "@repo/payments/keys";
import { keys as rateLimit } from "@repo/rate-limit/keys";
import { keys as security } from "@repo/security/keys";
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const presets = envPresets(
  ai(),
  auth(),
  analytics(),
  core(),
  database(),
  droid(),
  email(),
  observability(),
  payments(),
  rateLimit(),
  security(),
  status()
);

export const env = withPresets(
  createEnv({
    client: {},
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {
      CRON_SECRET: process.env.CRON_SECRET,
      STORE_NOTIFICATIONS_EMAIL: process.env.STORE_NOTIFICATIONS_EMAIL,
    },
    server: {
      // Shared secret Vercel Cron sends as a Bearer token. Generate with
      // `openssl rand -hex 32`. Cron routes reject every request when unset.
      CRON_SECRET: z.string().min(32).optional(),
      // Optional inbox that gets an email for every paid store order.
      STORE_NOTIFICATIONS_EMAIL: z.email().optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);

import { keys as analytics } from "@repo/analytics/keys";
import { keys as supabase } from "@repo/auth/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";

// Public values only: secrets live in apps/api (`bun run check:secrets`).
// The site reads the public catalog and editorial content with the
// publishable key (Row Level Security applies); the contact form and the
// status badge call apps/api at NEXT_PUBLIC_API_URL.
const presets = envPresets(analytics(), core(), observability(), supabase());

export const env = withPresets(
  createEnv({
    client: {},
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: presets,
    runtimeEnv: {},
    server: {},
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  }),
  presets
);

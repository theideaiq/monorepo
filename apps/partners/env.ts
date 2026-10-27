import { keys as analytics } from "@repo/analytics/keys";
import { keys as auth } from "@repo/auth/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";

// The IDEA Partners holds public values only (NEXT_PUBLIC_*): every page
// runs its queries as the signed-in user
// with the publishable key (RLS). Secrets live in apps/api, which this app
// calls with the user's token. Client components never import this file.
const presets = envPresets(auth(), analytics(), core(), observability());

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

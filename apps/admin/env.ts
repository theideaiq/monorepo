import { keys as auth } from "@repo/auth/keys";
import { envPresets, withPresets } from "@repo/next-config/env";
import { keys as core } from "@repo/next-config/keys";
import { keys as observability } from "@repo/observability/keys";
import { createEnv } from "@t3-oss/env-nextjs";

// The back office runs every query as the signed-in staff member (RLS), so it
// only needs the publishable Supabase key. Privileged steps (sending
// campaigns, looking up users by phone or email) go through apps/api with
// the staff member's access token.
const presets = envPresets(auth(), core(), observability());

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

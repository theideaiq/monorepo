import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

// Server-only: the Better Stack Uptime API token. Read by apps/api, which
// serves the status the website's footer shows (`GET /status`).
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      BETTERSTACK_API_KEY: process.env.BETTERSTACK_API_KEY,
      BETTERSTACK_URL: process.env.BETTERSTACK_URL,
    },
    server: {
      BETTERSTACK_API_KEY: z.string().optional(),
      // The public status page the badge links to.
      BETTERSTACK_URL: z.url().optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

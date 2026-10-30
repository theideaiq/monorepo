import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Reloadly (reloadly.com), the first supplier of digital codes. Buying
 * codes is off while the client id or secret is unset; paid codes then wait
 * as "to buy". See ARCHITECTURE_AND_INTEGRATIONS.md, "Digital codes".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      RELOADLY_CLIENT_ID: process.env.RELOADLY_CLIENT_ID,
      RELOADLY_CLIENT_SECRET: process.env.RELOADLY_CLIENT_SECRET,
      RELOADLY_ENVIRONMENT: process.env.RELOADLY_ENVIRONMENT,
    },
    server: {
      // Reloadly dashboard → Developers → API settings.
      RELOADLY_CLIENT_ID: z.string().min(8).optional(),
      RELOADLY_CLIENT_SECRET: z.string().min(8).optional(),
      // "sandbox" (test codes, the default) or "production" (real codes,
      // paid from the prepaid USD balance).
      RELOADLY_ENVIRONMENT: z
        .enum(["sandbox", "production"])
        .default("sandbox"),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

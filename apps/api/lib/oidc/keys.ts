import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Sign in with The IDEA Pass: the provider's signing key, a private EC
 * P-256 JWK with a `kid` (the JSON, or base64 of it). The provider's
 * endpoints answer 503 while it's unset. Generate one with
 * `bun run --cwd apps/api oidc:key`.
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      PASS_OIDC_SIGNING_KEY: process.env.PASS_OIDC_SIGNING_KEY,
    },
    server: {
      PASS_OIDC_SIGNING_KEY: z.string().min(40).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

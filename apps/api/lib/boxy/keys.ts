import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

const HEADER_NAME = /^[A-Za-z0-9-]+$/;

/**
 * Boxy (tryboxy.com), the courier for purchases. Sending orders to Boxy is
 * off while the key or secret is unset. See ARCHITECTURE_AND_INTEGRATIONS.md,
 * "Delivery with Boxy".
 */
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      BOXY_API_KEY: process.env.BOXY_API_KEY,
      BOXY_API_SECRET: process.env.BOXY_API_SECRET,
      BOXY_API_URL: process.env.BOXY_API_URL,
      BOXY_PICKUP_LOCATION: process.env.BOXY_PICKUP_LOCATION,
      BOXY_WEBHOOK_HEADER: process.env.BOXY_WEBHOOK_HEADER,
      BOXY_WEBHOOK_SECRET: process.env.BOXY_WEBHOOK_SECRET,
    },
    server: {
      // Boxy dashboard → Settings → Create a Personal Token.
      BOXY_API_KEY: z.string().min(8).optional(),
      BOXY_API_SECRET: z.string().min(8).optional(),
      // The API base, ending in /api/v1: production by default; the
      // sandbox is https://api-stg.tryboxy.dev/api/v1.
      BOXY_API_URL: z.url().default("https://api.tryboxy.com/api/v1"),
      // The pick-up location (warehouse) parcels are collected from: its
      // uid in Boxy. Boxy uses the merchant's default when unset.
      BOXY_PICKUP_LOCATION: z.string().min(1).optional(),
      // The header name and value set on the webhook in Boxy's dashboard
      // (Settings → Webhooks → custom header). Webhooks are refused while
      // the value is unset.
      BOXY_WEBHOOK_HEADER: z
        .string()
        .regex(HEADER_NAME)
        .default("x-boxy-secret"),
      BOXY_WEBHOOK_SECRET: z.string().min(16).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

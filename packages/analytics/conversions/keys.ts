import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";
import { keys as analytics } from "../keys";

// Server-side conversions (Meta Conversions API, TikTok Events API). Only
// server code imports this module, so the token names never reach a client
// bundle.
export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    extends: [analytics()],
    runtimeEnv: {
      META_CONVERSIONS_ACCESS_TOKEN: process.env.META_CONVERSIONS_ACCESS_TOKEN,
      META_TEST_EVENT_CODE: process.env.META_TEST_EVENT_CODE,
      TIKTOK_EVENTS_ACCESS_TOKEN: process.env.TIKTOK_EVENTS_ACCESS_TOKEN,
      TIKTOK_TEST_EVENT_CODE: process.env.TIKTOK_TEST_EVENT_CODE,
    },
    server: {
      META_CONVERSIONS_ACCESS_TOKEN: z.string().min(1).optional(),
      META_TEST_EVENT_CODE: z.string().min(1).optional(),
      TIKTOK_EVENTS_ACCESS_TOKEN: z.string().min(1).optional(),
      TIKTOK_TEST_EVENT_CODE: z.string().min(1).optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

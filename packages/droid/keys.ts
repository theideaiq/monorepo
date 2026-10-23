import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET,
    },
    server: {
      // From @BotFather. The webhook answers 503 while it is unset.
      TELEGRAM_BOT_TOKEN: z
        .string()
        .regex(/^\d+:[\w-]+$/)
        .optional(),
      // Telegram sends it in X-Telegram-Bot-Api-Secret-Token; 1–256 of
      // A-Z a-z 0-9 _ - (`openssl rand -hex 32`).
      TELEGRAM_WEBHOOK_SECRET: z
        .string()
        .regex(/^[\w-]{32,256}$/)
        .optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

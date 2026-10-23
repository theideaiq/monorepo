import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    // Treat KEY="" (as in .env.example) as unset.
    emptyStringAsUndefined: true,
    runtimeEnv: {
      AI_CHAT_MODEL: process.env.AI_CHAT_MODEL,
      AI_PROVIDER: process.env.AI_PROVIDER,
      GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
    server: {
      // Overrides the provider's default chat model id.
      AI_CHAT_MODEL: z.string().min(1).optional(),
      // Which provider serves chat models; Gemini when unset.
      AI_PROVIDER: z.enum(["google", "openai"]).optional(),
      GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1).optional(),
      OPENAI_API_KEY: z.string().startsWith("sk-").optional(),
    },
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
  });

import "server-only";

import { getChatModel } from "@repo/ai/lib/models";
import { createAdminClient } from "@repo/database/admin";
import {
  createBot,
  createMemoryStore,
  createSupabaseData,
  createUpstashStore,
  type DroidBot,
  type KeyValueStore,
} from "@repo/droid";
import { log } from "@repo/observability/log";
import { Redis } from "@upstash/redis";
import { env } from "@/env";

const createStore = (): KeyValueStore => {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return createUpstashStore(
      new Redis({
        token: env.UPSTASH_REDIS_REST_TOKEN,
        url: env.UPSTASH_REDIS_REST_URL,
      })
    );
  }
  // Fine for local development; on serverless each instance would keep its
  // own sessions and flood counters.
  log.warn("Droid is using an in-memory store: set the Upstash Redis keys.");
  return createMemoryStore();
};

let droid: Promise<DroidBot> | undefined;

/** The bot for this server instance, initialised once (`getMe`). */
export const getDroid = () => {
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return;
  }
  droid ??= (async () => {
    const bot = createBot({
      appUrl: env.NEXT_PUBLIC_APP_URL,
      data: createSupabaseData(createAdminClient()),
      logger: log,
      model: getChatModel(),
      store: createStore(),
      token,
    });
    await bot.init();
    return bot;
  })().catch((error: unknown) => {
    // Try again on the next update instead of caching the failure.
    droid = undefined;
    throw error;
  });
  return droid;
};

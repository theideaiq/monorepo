import "server-only";

import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { env } from "@/env";
import { checkVerification, startVerification } from "./client";
import type { PhoneDeps } from "./handler";

// Codes cost money: ten sends or checks per Pass an hour, on top of
// Twilio's own limits per number.
const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRateLimiter({ limiter: slidingWindow(10, "1 h") })
    : undefined;

/** The live dependencies of the phone endpoints. */
export const phoneDeps = (): PhoneDeps => {
  const config =
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_VERIFY_SERVICE_SID
      ? {
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          serviceSid: env.TWILIO_VERIFY_SERVICE_SID,
        }
      : undefined;

  return {
    limit: rateLimiter
      ? async (key) => (await rateLimiter.limit(key)).success
      : undefined,
    logError: (error) =>
      log.error(`Phone verification failed: ${parseError(error)}`),
    save: async (userId, phone) => {
      const { error } = await createAdminClient()
        .from("verified_phones")
        .upsert(
          { phone, user_id: userId, verified_at: new Date().toISOString() },
          { onConflict: "user_id,phone" }
        );
      if (error) {
        throw error;
      }
    },
    verify: config
      ? {
          check: (phone, code) => checkVerification(config, phone, code),
          start: (phone, locale, channel) =>
            startVerification(config, phone, locale, channel),
        }
      : undefined,
  };
};

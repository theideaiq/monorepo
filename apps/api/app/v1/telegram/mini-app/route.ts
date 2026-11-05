import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { createRateLimiter, slidingWindow } from "@repo/rate-limit";
import { env } from "@/env";
import { clientIp } from "@/lib/contact";
import { webCorsHeaders, webPreflight } from "@/lib/cors";
import { handleMiniAppSignIn } from "@/lib/telegram-mini-app";

export const OPTIONS = webPreflight;

const rateLimiter =
  env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
    ? createRateLimiter({ limiter: slidingWindow(10, "10 m") })
    : undefined;

/** The email of the Pass a Telegram account is linked to (not suspended). */
const linkedEmail = async (telegramId: number) => {
  const admin = createAdminClient();
  const { data: member } = await admin
    .from("telegram_members")
    .select("user_id")
    .eq("id", telegramId)
    .maybeSingle();
  if (!member?.user_id) {
    return null;
  }
  const { data: profile } = await admin
    .from("profiles")
    .select("banned_at")
    .eq("id", member.user_id)
    .maybeSingle();
  if (!profile || profile.banned_at) {
    return null;
  }
  const { data } = await admin.auth.admin.getUserById(member.user_id);
  return data.user?.email ?? null;
};

/** A one-time, hashed sign-in token for the Pass with that email. */
const signInToken = async (email: string) => {
  const { data, error } = await createAdminClient().auth.admin.generateLink({
    email,
    type: "magiclink",
  });
  if (error) {
    log.error(`Mini App sign-in link failed: ${parseError(error)}`);
    return null;
  }
  return data.properties?.hashed_token ?? null;
};

/**
 * A26: the website inside Telegram (the Droid's Mini App) signs a linked
 * Telegram account straight in. Only the website's origin may call it.
 */
export const POST = async (request: Request) => {
  const body = await request.json().catch(() => null);
  const { body: result, status } = await handleMiniAppSignIn(
    body,
    clientIp(request),
    {
      botToken: env.TELEGRAM_BOT_TOKEN,
      limit: rateLimiter
        ? async (key) => (await rateLimiter.limit(key)).success
        : undefined,
      linkedEmail,
      signInToken,
    }
  );
  return Response.json(result, { headers: webCorsHeaders(request), status });
};

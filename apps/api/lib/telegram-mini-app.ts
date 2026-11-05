import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signing in from the Droid's Mini App (A26): Telegram hands the Mini App
 * `initData`, signed with the bot's token. A Telegram account linked to a
 * Pass (`telegram_members.user_id`) signs straight in; anything else falls
 * back to the Mini App's buttons. Only data signed in the last
 * `MAX_AGE_SECONDS` is accepted, so a copied `initData` soon stops working.
 */

/** How long a Mini App's `initData` can sign in after Telegram signed it. */
export const MAX_AGE_SECONDS = 10 * 60;

/** Telegram's clock may be a little ahead of ours. */
const CLOCK_SKEW_SECONDS = 60;

const HASH = /^[0-9a-f]{64}$/;

/**
 * The Telegram user id `initData` vouches for, or null when its signature,
 * age or user is wrong (Telegram: "Validating data received via the Mini
 * App"). Compared in constant time.
 */
export const verifyInitData = (
  initData: string,
  botToken: string,
  now = Date.now()
): number | null => {
  if (!(initData && botToken) || initData.length > 4096) {
    return null;
  }
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!(hash && HASH.test(hash))) {
    return null;
  }
  params.delete("hash");
  const check = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(check).digest();
  const received = Buffer.from(hash, "hex");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(expected, received)
  ) {
    return null;
  }

  const signedAt = Number(params.get("auth_date"));
  const age = now / 1000 - signedAt;
  if (
    !Number.isInteger(signedAt) ||
    age > MAX_AGE_SECONDS ||
    age < -CLOCK_SKEW_SECONDS
  ) {
    return null;
  }

  try {
    const user = JSON.parse(params.get("user") ?? "null") as {
      id?: unknown;
    } | null;
    const id = user?.id;
    return typeof id === "number" && Number.isSafeInteger(id) && id > 0
      ? id
      : null;
  } catch {
    return null;
  }
};

export interface MiniAppSignInDeps {
  /** The bot's token; without it the Mini App can't sign in. */
  readonly botToken: string | undefined;
  /** False when the caller has tried too often. */
  readonly limit?: (key: string) => Promise<boolean>;
  /** The email of the Pass linked to a Telegram account, if any. */
  readonly linkedEmail: (telegramId: number) => Promise<string | null>;
  /** A one-time sign-in token (hashed) for that email. */
  readonly signInToken: (email: string) => Promise<string | null>;
}

interface Result {
  body: { error: string; ok: false } | { ok: true; tokenHash: string };
  status: number;
}

const failure = (status: number, error: string): Result => ({
  body: { error, ok: false },
  status,
});

/**
 * `POST /v1/telegram/mini-app` with `{ initData }`: a one-time token the
 * website exchanges for a session (`verifyOtp`), or why not.
 */
export const handleMiniAppSignIn = async (
  body: unknown,
  ip: string,
  deps: MiniAppSignInDeps
): Promise<Result> => {
  if (!deps.botToken) {
    return failure(503, "not_configured");
  }
  if (deps.limit && !(await deps.limit(`telegram_mini_app_${ip}`))) {
    return failure(429, "rate_limited");
  }
  const initData =
    body && typeof body === "object" && "initData" in body
      ? (body as { initData: unknown }).initData
      : null;
  if (typeof initData !== "string") {
    return failure(400, "invalid_request");
  }
  const telegramId = verifyInitData(initData, deps.botToken);
  if (!telegramId) {
    return failure(401, "invalid_init_data");
  }
  const email = await deps.linkedEmail(telegramId);
  if (!email) {
    return failure(404, "not_linked");
  }
  const tokenHash = await deps.signInToken(email);
  return tokenHash
    ? { body: { ok: true, tokenHash }, status: 200 }
    : failure(500, "sign_in_failed");
};

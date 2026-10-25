import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Telegram Mini Apps (core.telegram.org/bots/webapps): Telegram opens the
 * website with `initData`, a query string signed with the bot's token. The
 * check: `secret = HMAC-SHA256("WebAppData", token)`, then
 * `hash = HMAC-SHA256(secret, data-check-string)`, where the data-check
 * string is every field but `hash`, sorted, as `key=value` lines.
 */

/** One hour: a Mini App sends its initData as soon as it opens. */
export const INIT_DATA_MAX_AGE_SECONDS = 3600;

export interface WebAppUser {
  firstName: string | null;
  id: number;
  languageCode: string | null;
  lastName: string | null;
  username: string | null;
}

interface RawUser {
  first_name?: unknown;
  id?: unknown;
  language_code?: unknown;
  last_name?: unknown;
  username?: unknown;
}

const text = (value: unknown) =>
  typeof value === "string" && value ? value : null;

const parseUser = (raw: string | null): WebAppUser | null => {
  try {
    const user = JSON.parse(raw ?? "") as RawUser;
    if (typeof user.id !== "number" || !Number.isSafeInteger(user.id)) {
      return null;
    }
    return {
      firstName: text(user.first_name),
      id: user.id,
      languageCode: text(user.language_code),
      lastName: text(user.last_name),
      username: text(user.username),
    };
  } catch {
    return null;
  }
};

/** The hash Telegram would send for these fields (hex). */
export const initDataHash = (fields: URLSearchParams, botToken: string) => {
  const checkString = [...fields]
    .filter(([key]) => key !== "hash")
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(checkString).digest("hex");
};

/**
 * The Telegram user a Mini App's initData vouches for, or null when it isn't
 * signed with this bot's token, is older than `maxAgeSeconds` or has no user.
 */
export const verifyInitData = (
  initData: string,
  botToken: string,
  { maxAgeSeconds = INIT_DATA_MAX_AGE_SECONDS, now = Date.now() } = {}
): WebAppUser | null => {
  const fields = new URLSearchParams(initData);
  const given = Buffer.from(fields.get("hash") ?? "", "hex");
  const expected = Buffer.from(initDataHash(fields, botToken), "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  const authDate = Number(fields.get("auth_date"));
  const age = now / 1000 - authDate;
  if (!Number.isFinite(authDate) || age > maxAgeSeconds || age < -60) {
    return null;
  }
  return parseUser(fields.get("user"));
};

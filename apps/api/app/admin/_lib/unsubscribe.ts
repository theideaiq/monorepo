import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed one-click unsubscribe tokens: "<user id>.<signature>". The key is
 * derived from the server's Supabase secret key, so no extra secret has to
 * be configured; rotating that key invalidates links in old emails, which
 * then fall back to the account settings. Tokens don't expire: unsubscribe
 * links must keep working.
 */
const PURPOSE = "theideaiq:marketing-unsubscribe:v1";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const signingKey = (secret: string) =>
  createHmac("sha256", secret).update(PURPOSE).digest();

const sign = (secret: string, userId: string) =>
  createHmac("sha256", signingKey(secret))
    .update(userId.toLowerCase())
    .digest("base64url");

export const createUnsubscribeToken = (secret: string, userId: string) =>
  `${userId.toLowerCase()}.${sign(secret, userId)}`;

/** The user id of a valid token, or null. */
export const verifyUnsubscribeToken = (
  secret: string,
  token: string | null | undefined
): string | null => {
  const [userId, signature, extra] = (token ?? "").split(".");
  if (!(userId && signature) || extra !== undefined || !UUID.test(userId)) {
    return null;
  }
  const expected = Buffer.from(sign(secret, userId));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  return userId.toLowerCase();
};

/** The link in each campaign email (also used as List-Unsubscribe). */
export const unsubscribeUrl = (
  apiUrl: string,
  secret: string,
  userId: string,
  locale: string
) => {
  const url = new URL("/admin/unsubscribe", apiUrl);
  url.searchParams.set("token", createUnsubscribeToken(secret, userId));
  url.searchParams.set("lang", locale === "en" ? "en" : "ar");
  return url.toString();
};

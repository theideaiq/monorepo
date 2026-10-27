import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { JWK } from "jose";

/**
 * The protocol parts of The IDEA Pass's OpenID Connect provider that need
 * no database: hashing, PKCE, client authentication and the claims a
 * scope unlocks. See ARCHITECTURE_AND_INTEGRATIONS.md, "Sign in with The
 * IDEA Pass".
 */

/** The answers a partner may ask for, besides `openid` (sign-in itself). */
export const PASS_SCOPES = [
  "profile",
  "email",
  "membership",
  "student",
  "student_email",
  "adult",
  "plus",
  "phone",
  "birthdate",
  "address",
  "card",
  "offline_access",
] as const;

export type PassScope = (typeof PASS_SCOPES)[number];

/** Lifetime of access and ID tokens, in seconds. */
export const TOKEN_SECONDS = 3600;

/** SHA-256 of a string, as hex (how codes, tokens and secrets are stored). */
export const sha256Hex = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

/** Compares two hex digests in constant time. */
export const sameDigest = (a: string, b: string) => {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
};

/** A random token for access tokens (and, in the back office, secrets). */
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("hex");

const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

/** PKCE (S256): the verifier must hash to the challenge sent with the request. */
export const verifyPkce = (verifier: string | null, challenge: string) =>
  Boolean(verifier && VERIFIER.test(verifier)) &&
  createHash("sha256")
    .update(verifier ?? "", "ascii")
    .digest("base64url") === challenge;

const BASIC = /^Basic\s+(.+)$/i;

/**
 * The client's credentials: HTTP Basic (`client_secret_basic`, the default)
 * or the form's `client_id` and `client_secret` (`client_secret_post`).
 */
export const clientCredentials = (
  authorization: string | null,
  form: URLSearchParams
) => {
  const basic = BASIC.exec(authorization ?? "")?.[1];
  if (basic) {
    const decoded = Buffer.from(basic, "base64").toString("utf8");
    const colon = decoded.indexOf(":");
    if (colon < 1) {
      return null;
    }
    return {
      clientId: decodeURIComponent(decoded.slice(0, colon)),
      secret: decodeURIComponent(decoded.slice(colon + 1)),
    };
  }
  const clientId = form.get("client_id");
  const secret = form.get("client_secret");
  return clientId && secret ? { clientId, secret } : null;
};

/** An OAuth error response body (RFC 6749 §5.2). */
export const oauthError = (error: string, description?: string) => ({
  error,
  ...(description ? { error_description: description } : {}),
});

/** The token endpoint's headers: tokens are never cached. */
export const noStore = {
  "Cache-Control": "no-store",
  Pragma: "no-cache",
} as const;

/** Reads PASS_OIDC_SIGNING_KEY (JSON or base64 JSON). */
export const parseSigningKey = (raw: string | undefined): JWK | null => {
  if (!raw) {
    return null;
  }
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  try {
    const jwk = JSON.parse(text) as JWK;
    return jwk.kty === "EC" && jwk.crv === "P-256" && jwk.d && jwk.kid
      ? jwk
      : null;
  } catch {
    return null;
  }
};

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Telegram's OpenID Connect sign-in (core.telegram.org/bots/telegram-login):
 * the authorization code flow with PKCE, the code exchanged with the bot's
 * Client ID and Secret, and the ID token checked against Telegram's keys.
 */

export const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const AUTHORIZE_URL = `${TELEGRAM_ISSUER}/auth`;
const TOKEN_URL = `${TELEGRAM_ISSUER}/token`;
const jwks = createRemoteJWKSet(
  new URL(`${TELEGRAM_ISSUER}/.well-known/jwks.json`)
);

/** Profile, and permission for the bot to message the member. */
export const TELEGRAM_SCOPE = "openid profile telegram:bot_access";

export interface TelegramClient {
  clientId: string;
  clientSecret: string;
}

/** The Telegram account an ID token vouches for. */
export interface TelegramIdentity {
  firstName: string | null;
  id: number;
  lastName: string | null;
  name: string | null;
  username: string | null;
}

const base64url = (bytes: Buffer) => bytes.toString("base64url");

/** A random string for `state` and the PKCE verifier. */
export const randomToken = () => base64url(randomBytes(32));

/** The S256 PKCE challenge of a verifier. */
export const codeChallenge = (verifier: string) =>
  base64url(createHash("sha256").update(verifier).digest());

/** Where to send the browser to sign in with Telegram. */
export const authorizeUrl = ({
  clientId,
  redirectUri,
  state,
  verifier,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  verifier: string;
}) => {
  const url = new URL(AUTHORIZE_URL);
  url.search = new URLSearchParams({
    client_id: clientId,
    code_challenge: codeChallenge(verifier),
    code_challenge_method: "S256",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: TELEGRAM_SCOPE,
    state,
  }).toString();
  return url.toString();
};

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

/** Checks an ID token's signature, issuer, audience and expiry. */
export const verifyIdToken = async (
  idToken: string,
  clientId: string,
  keys: Parameters<typeof jwtVerify>[1] = jwks
): Promise<TelegramIdentity> => {
  const { payload } = await jwtVerify(idToken, keys, {
    audience: clientId,
    issuer: TELEGRAM_ISSUER,
  });
  const id = Number(payload.id);
  if (!(Number.isSafeInteger(id) && id > 0)) {
    throw new Error("The ID token has no Telegram user id");
  }
  return {
    firstName: text(payload.given_name),
    id,
    lastName: text(payload.family_name),
    name: text(payload.name),
    username: text(payload.preferred_username),
  };
};

/** Exchanges the code for an ID token and checks it. */
export const exchangeCode = async (
  client: TelegramClient,
  {
    code,
    redirectUri,
    verifier,
  }: { code: string; redirectUri: string; verifier: string },
  fetcher: typeof fetch = fetch
) => {
  const response = await fetcher(TOKEN_URL, {
    body: new URLSearchParams({
      client_id: client.clientId,
      code,
      code_verifier: verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
    headers: {
      Authorization: `Basic ${Buffer.from(`${client.clientId}:${client.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Telegram token exchange failed (${response.status})`);
  }
  const body = (await response.json()) as { id_token?: unknown };
  if (typeof body.id_token !== "string") {
    throw new Error("Telegram returned no ID token");
  }
  return verifyIdToken(body.id_token, client.clientId);
};

/**
 * Small signed values (the sign-in cookie, the link ticket): JSON with an
 * expiry, HMAC-SHA256 with the client secret and a purpose, so one can't
 * stand in for the other.
 */
const sign = (secret: string, purpose: string, body: string) =>
  createHmac("sha256", secret).update(`${purpose}.${body}`).digest("base64url");

export const seal = (
  secret: string,
  purpose: string,
  value: object,
  ttlSeconds: number
) => {
  const body = Buffer.from(
    JSON.stringify({
      ...value,
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    })
  ).toString("base64url");
  return `${body}.${sign(secret, purpose, body)}`;
};

export const unseal = <T extends object>(
  secret: string,
  purpose: string,
  sealed: string | null | undefined
): T | null => {
  const [body, signature] = (sealed ?? "").split(".");
  if (!(body && signature)) {
    return null;
  }
  const expected = Buffer.from(sign(secret, purpose, body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return null;
  }
  try {
    const value = JSON.parse(Buffer.from(body, "base64url").toString()) as T & {
      exp?: number;
    };
    return typeof value.exp === "number" && value.exp > Date.now() / 1000
      ? value
      : null;
  } catch {
    return null;
  }
};

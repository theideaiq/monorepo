import { exportJWK, importJWK, type JWK, SignJWT } from "jose";
import { env } from "@/env";
import { parseSigningKey, TOKEN_SECONDS } from "./protocol";

const TRAILING_SLASH = /\/$/;

/** The provider's issuer: `<API URL>/oidc`. */
export const issuer = () =>
  `${(env.NEXT_PUBLIC_API_URL ?? "https://api.theideaiq.com").replace(TRAILING_SLASH, "")}/oidc`;

interface SigningKey {
  key: CryptoKey;
  kid: string;
  publicJwk: JWK;
}

let cached: Promise<SigningKey | null> | undefined;

const load = async (): Promise<SigningKey | null> => {
  const jwk = parseSigningKey(env.PASS_OIDC_SIGNING_KEY);
  if (!jwk) {
    return null;
  }
  const key = (await importJWK(jwk, "ES256")) as CryptoKey;
  const { d: _private, ...rest } = jwk;
  const publicJwk = await exportJWK(
    (await importJWK(rest, "ES256")) as CryptoKey
  );
  return {
    key,
    kid: jwk.kid as string,
    publicJwk: { ...publicJwk, alg: "ES256", kid: jwk.kid, use: "sig" },
  };
};

/** The signing key, or null while the provider isn't set up. */
export const signingKey = () => {
  cached ??= load();
  return cached;
};

/** Signs an ID token for a partner. */
export const signIdToken = async (
  signing: SigningKey,
  {
    audience,
    claims,
    nonce,
  }: {
    audience: string;
    claims: Record<string, unknown>;
    nonce: string | null;
  }
) =>
  new SignJWT({ ...claims, ...(nonce ? { nonce } : {}) })
    .setProtectedHeader({ alg: "ES256", kid: signing.kid, typ: "JWT" })
    .setIssuer(issuer())
    .setAudience(audience)
    .setSubject(String(claims.sub))
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_SECONDS}s`)
    .sign(signing.key);

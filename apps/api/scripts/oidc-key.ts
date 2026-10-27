/**
 * Prints a new signing key for Sign in with The IDEA Pass (a private EC
 * P-256 JWK with a kid, base64) for PASS_OIDC_SIGNING_KEY. Rotating it
 * signs new ID tokens with the new key; partners fetch it from /oidc/jwks.
 *
 *   bun run --cwd apps/api oidc:key
 */
import { randomUUID } from "node:crypto";
import { exportJWK, generateKeyPair } from "jose";

const { privateKey } = await generateKeyPair("ES256", { extractable: true });
const jwk = {
  ...(await exportJWK(privateKey)),
  alg: "ES256",
  kid: randomUUID(),
};
console.log(Buffer.from(JSON.stringify(jwk)).toString("base64"));

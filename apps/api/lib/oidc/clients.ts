import { createAdminClient } from "@repo/database/admin";
import type { JSONWebKeySet } from "jose";
import {
  clientAssertion,
  clientCredentials,
  secretMatches,
  sha256Hex,
  verifyClientAssertion,
} from "./protocol";
import { issuer } from "./signing";

type Admin = ReturnType<typeof createAdminClient>;

/** private_key_jwt: a signed assertion, each `jti` accepted once. */
const assertedPartner = async (
  admin: Admin,
  asserted: { assertion: string; clientId: string }
) => {
  const { data: partner } = await admin
    .from("pass_partners")
    .select("client_id, active, public_jwks")
    .eq("client_id", asserted.clientId)
    .maybeSingle();
  if (!(partner?.active && partner.public_jwks)) {
    return null;
  }
  const verified = await verifyClientAssertion(
    asserted.assertion,
    partner.client_id,
    partner.public_jwks as unknown as JSONWebKeySet,
    issuer()
  );
  if (!verified) {
    return null;
  }
  await admin
    .from("pass_client_assertions")
    .delete()
    .lt("expires_at", new Date().toISOString());
  const { error } = await admin.from("pass_client_assertions").insert({
    client_id: partner.client_id,
    expires_at: verified.expiresAt.toISOString(),
    jti: verified.jti,
  });
  return error ? null : partner.client_id;
};

/**
 * The partner calling a server-to-server endpoint (token, card check):
 * from its client id and secret (the previous secret works for 24 hours
 * after a rotation) or a client assertion signed with one of its keys;
 * null when they don't match an active partner.
 */
export const authenticatePartner = async (
  request: Request,
  form: URLSearchParams
) => {
  const admin = createAdminClient();
  const asserted = clientAssertion(form);
  if (asserted) {
    const clientId = await assertedPartner(admin, asserted);
    return clientId ? { admin, clientId } : null;
  }
  const credentials = clientCredentials(
    request.headers.get("authorization"),
    form
  );
  if (!credentials) {
    return null;
  }
  const { data: partner } = await admin
    .from("pass_partners")
    .select(
      "client_id, secret_hash, previous_secret_hash, previous_secret_until, active"
    )
    .eq("client_id", credentials.clientId)
    .maybeSingle();
  if (!(partner?.active && secretMatches(partner, credentials.secret))) {
    return null;
  }
  return { admin, clientId: partner.client_id };
};

const BEARER = /^Bearer\s+([0-9a-f]{64})$/i;

/** A partner's access token (for userinfo and the card), when it's current. */
export const accessTokenOf = async (request: Request) => {
  const token = BEARER.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) {
    return null;
  }
  const admin = createAdminClient();
  const { data: access } = await admin
    .from("pass_access_tokens")
    .select("client_id, user_id, scopes")
    .eq("token_hash", sha256Hex(token.toLowerCase()))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return access ? { ...access, admin } : null;
};

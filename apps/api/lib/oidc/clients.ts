import { createAdminClient } from "@repo/database/admin";
import { clientCredentials, sameDigest, sha256Hex } from "./protocol";

/**
 * The partner calling a server-to-server endpoint (token, card check),
 * from its client id and secret; null when they don't match an active
 * partner.
 */
export const authenticatePartner = async (
  request: Request,
  form: URLSearchParams
) => {
  const credentials = clientCredentials(
    request.headers.get("authorization"),
    form
  );
  if (!credentials) {
    return null;
  }
  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("pass_partners")
    .select("client_id, secret_hash, active")
    .eq("client_id", credentials.clientId)
    .maybeSingle();
  if (
    !(
      partner?.active &&
      sameDigest(partner.secret_hash, sha256Hex(credentials.secret))
    )
  ) {
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

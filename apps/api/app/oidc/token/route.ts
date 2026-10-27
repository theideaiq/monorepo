import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { authenticatePartner } from "@/lib/oidc/clients";
import {
  noStore,
  oauthError,
  randomToken,
  sha256Hex,
  TOKEN_SECONDS,
  verifyPkce,
} from "@/lib/oidc/protocol";
import { signIdToken, signingKey } from "@/lib/oidc/signing";

const reply = (data: object, status = 200, extra: HeadersInit = {}) =>
  NextResponse.json(data, { headers: { ...noStore, ...extra }, status });

const invalidClient = () =>
  reply(oauthError("invalid_client"), 401, {
    "WWW-Authenticate": 'Basic realm="The IDEA Pass"',
  });

/**
 * Sign in with The IDEA Pass: a partner exchanges the one-use code it got
 * on its return address (after the person allowed it on the website) for
 * an ID token and an access token for the userinfo endpoint. Partners
 * authenticate with their client secret and the PKCE verifier.
 */
export const POST = async (request: Request) => {
  const signing = await signingKey();
  if (!signing) {
    return reply(oauthError("temporarily_unavailable"), 503);
  }
  const form = new URLSearchParams(await request.text().catch(() => ""));
  const partner = await authenticatePartner(request, form);
  if (!partner) {
    return invalidClient();
  }
  const { admin } = partner;
  if (form.get("grant_type") !== "authorization_code") {
    return reply(oauthError("unsupported_grant_type"), 400);
  }

  // The code works once, for 5 minutes, for the partner it was made for.
  const { data: code } = await admin
    .from("pass_sign_in_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", sha256Hex(form.get("code") ?? ""))
    .eq("client_id", partner.clientId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id, redirect_uri, scopes, code_challenge, nonce")
    .maybeSingle();
  if (
    !code ||
    code.redirect_uri !== form.get("redirect_uri") ||
    !verifyPkce(form.get("code_verifier"), code.code_challenge)
  ) {
    return reply(oauthError("invalid_grant"), 400);
  }

  const { data: claims, error } = await admin.rpc("pass_claims", {
    client: partner.clientId,
    member: code.user_id,
    scopes: code.scopes,
  });
  if (error || !claims) {
    return reply(oauthError("invalid_grant"), 400);
  }

  const accessToken = randomToken();
  const expiresAt = new Date(Date.now() + TOKEN_SECONDS * 1000);
  try {
    const [saved] = await Promise.all([
      admin.from("pass_access_tokens").insert({
        client_id: partner.clientId,
        expires_at: expiresAt.toISOString(),
        scopes: code.scopes,
        token_hash: sha256Hex(accessToken),
        user_id: code.user_id,
      }),
      admin
        .from("pass_connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", code.user_id)
        .eq("client_id", partner.clientId),
    ]);
    if (saved.error) {
      throw saved.error;
    }
    const idToken = await signIdToken(signing, {
      audience: partner.clientId,
      claims: claims as Record<string, unknown>,
      nonce: code.nonce,
    });
    return reply({
      access_token: accessToken,
      expires_in: TOKEN_SECONDS,
      id_token: idToken,
      scope: code.scopes.join(" "),
      token_type: "Bearer",
    });
  } catch (tokenError) {
    log.error(`Pass sign-in token failed: ${parseError(tokenError)}`);
    return reply(oauthError("server_error"), 500);
  }
};

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

/** Refresh tokens (`offline_access`) last 90 days and work once each. */
const REFRESH_DAYS = 90;

type Admin = NonNullable<
  Awaited<ReturnType<typeof authenticatePartner>>
>["admin"];

interface Grant {
  nonce: string | null;
  scopes: string[];
  userId: string;
}

/** The code works once, for 5 minutes, for the partner it was made for. */
const codeGrant = async (
  admin: Admin,
  clientId: string,
  form: URLSearchParams
): Promise<Grant | null> => {
  const { data: code } = await admin
    .from("pass_sign_in_codes")
    .update({ used_at: new Date().toISOString() })
    .eq("code_hash", sha256Hex(form.get("code") ?? ""))
    .eq("client_id", clientId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id, redirect_uri, scopes, code_challenge, nonce")
    .maybeSingle();
  if (
    !code ||
    code.redirect_uri !== form.get("redirect_uri") ||
    !verifyPkce(form.get("code_verifier"), code.code_challenge)
  ) {
    return null;
  }
  return { nonce: code.nonce, scopes: code.scopes, userId: code.user_id };
};

/** A refresh token works once: it's replaced by a new one each time. */
const refreshGrant = async (
  admin: Admin,
  clientId: string,
  form: URLSearchParams
): Promise<Grant | null> => {
  const { data: used } = await admin
    .from("pass_refresh_tokens")
    .delete()
    .eq("token_hash", sha256Hex(form.get("refresh_token") ?? ""))
    .eq("client_id", clientId)
    .gt("expires_at", new Date().toISOString())
    .select("user_id, scopes")
    .maybeSingle();
  return used
    ? { nonce: null, scopes: used.scopes, userId: used.user_id }
    : null;
};

/**
 * Sign in with The IDEA Pass: a partner exchanges the one-use code it got
 * on its return address (after the person allowed it on the website) for
 * an ID token, an access token for userinfo and the card, and, with
 * `offline_access`, a refresh token. Partners authenticate with their
 * client secret (and the PKCE verifier for codes).
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
  const { admin, clientId } = partner;
  const grantType = form.get("grant_type");
  let grant: Grant | null = null;
  if (grantType === "authorization_code") {
    grant = await codeGrant(admin, clientId, form);
  } else if (grantType === "refresh_token") {
    grant = await refreshGrant(admin, clientId, form);
  } else {
    return reply(oauthError("unsupported_grant_type"), 400);
  }
  if (!grant) {
    return reply(oauthError("invalid_grant"), 400);
  }

  // No claims means the person disconnected the site.
  const { data: claims, error } = await admin.rpc("pass_claims", {
    client: clientId,
    member: grant.userId,
    scopes: grant.scopes,
  });
  if (error || !claims) {
    return reply(oauthError("invalid_grant"), 400);
  }

  const accessToken = randomToken();
  const refreshToken = grant.scopes.includes("offline_access")
    ? randomToken()
    : null;
  try {
    const [saved, refreshSaved] = await Promise.all([
      admin.from("pass_access_tokens").insert({
        client_id: clientId,
        expires_at: new Date(Date.now() + TOKEN_SECONDS * 1000).toISOString(),
        scopes: grant.scopes,
        token_hash: sha256Hex(accessToken),
        user_id: grant.userId,
      }),
      refreshToken
        ? admin.from("pass_refresh_tokens").insert({
            client_id: clientId,
            expires_at: new Date(
              Date.now() + REFRESH_DAYS * 86_400_000
            ).toISOString(),
            scopes: grant.scopes,
            token_hash: sha256Hex(refreshToken),
            user_id: grant.userId,
          })
        : Promise.resolve({ error: null }),
      admin
        .from("pass_connections")
        .update({ last_used_at: new Date().toISOString() })
        .eq("user_id", grant.userId)
        .eq("client_id", clientId),
    ]);
    if (saved.error || refreshSaved.error) {
      throw saved.error ?? refreshSaved.error;
    }
    const idToken = await signIdToken(signing, {
      audience: clientId,
      claims: claims as Record<string, unknown>,
      nonce: grant.nonce,
    });
    return reply({
      access_token: accessToken,
      expires_in: TOKEN_SECONDS,
      id_token: idToken,
      ...(refreshToken ? { refresh_token: refreshToken } : {}),
      scope: grant.scopes.join(" "),
      token_type: "Bearer",
    });
  } catch (tokenError) {
    log.error(`Pass sign-in token failed: ${parseError(tokenError)}`);
    return reply(oauthError("server_error"), 500);
  }
};

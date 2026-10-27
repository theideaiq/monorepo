import { NextResponse } from "next/server";
import { env } from "@/env";
import { PASS_SCOPES } from "@/lib/oidc/protocol";
import { issuer, signingKey } from "@/lib/oidc/signing";

const PUBLIC = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=3600",
};

/**
 * Sign in with The IDEA Pass: the OpenID Connect discovery document.
 * People allow a partner on the website (/oauth/authorize); the partner
 * exchanges the code here, at the API.
 */
export const GET = async () => {
  if (!(await signingKey())) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  const iss = issuer();
  return NextResponse.json(
    {
      authorization_endpoint: `${new URL(env.NEXT_PUBLIC_WEB_URL).origin}/oauth/authorize`,
      claims_supported: [
        "sub",
        "name",
        "given_name",
        "family_name",
        "locale",
        "picture",
        "email",
        "email_verified",
        "member_number",
        "member_since",
        "student",
        "student_email",
        "student_email_verified",
        "adult",
        "plus",
        "plus_plan",
        "phone_number",
        "phone_number_verified",
        "birthdate",
        "address",
      ],
      code_challenge_methods_supported: ["S256"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      id_token_signing_alg_values_supported: ["ES256"],
      issuer: iss,
      jwks_uri: `${iss}/jwks`,
      response_modes_supported: ["query"],
      response_types_supported: ["code"],
      scopes_supported: ["openid", ...PASS_SCOPES],
      subject_types_supported: ["pairwise"],
      token_endpoint: `${iss}/token`,
      token_endpoint_auth_methods_supported: [
        "client_secret_basic",
        "client_secret_post",
        "private_key_jwt",
      ],
      token_endpoint_auth_signing_alg_values_supported: ["ES256", "RS256"],
      ui_locales_supported: ["ar", "en"],
      userinfo_endpoint: `${iss}/userinfo`,
    },
    { headers: PUBLIC }
  );
};

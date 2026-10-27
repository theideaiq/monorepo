import { NextResponse } from "next/server";
import { accessTokenOf } from "@/lib/oidc/clients";

const headers = {
  "Access-Control-Allow-Headers": "authorization",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store",
};

export const OPTIONS = () => new Response(null, { headers, status: 204 });

/**
 * Sign in with The IDEA Pass: the person's claims for the scopes they
 * shared, worked out now (so a badge that ended reads as not verified).
 * Stops working when they disconnect the site.
 */
const userinfo = async (request: Request) => {
  const unauthorized = () =>
    NextResponse.json(
      { error: "invalid_token" },
      {
        headers: {
          ...headers,
          "WWW-Authenticate": 'Bearer error="invalid_token"',
        },
        status: 401,
      }
    );
  const access = await accessTokenOf(request);
  if (!access) {
    return unauthorized();
  }
  const { admin } = access;
  const { data: claims } = await admin.rpc("pass_claims", {
    client: access.client_id,
    member: access.user_id,
    scopes: access.scopes,
  });
  if (!claims) {
    return unauthorized();
  }
  return NextResponse.json(claims, { headers });
};

export const GET = userinfo;
export const POST = userinfo;

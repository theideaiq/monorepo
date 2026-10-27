import { NextResponse } from "next/server";
import { signingKey } from "@/lib/oidc/signing";

/** Sign in with The IDEA Pass: the public key that verifies ID tokens. */
export const GET = async () => {
  const signing = await signingKey();
  if (!signing) {
    return NextResponse.json({ error: "unavailable" }, { status: 503 });
  }
  return NextResponse.json(
    { keys: [signing.publicJwk] },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
};

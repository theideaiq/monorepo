import { authenticateRequest } from "@repo/auth/verify";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { phoneDeps } from "@/lib/phone-verify";
import { handlePhoneCheck } from "@/lib/phone-verify/handler";

export const OPTIONS = preflight;

/**
 * Checks the code the caller typed; an approved number is saved as
 * theirs (verified_phones).
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", ok: false },
      { headers, status: 401 }
    );
  }

  const { body, status } = await handlePhoneCheck(
    request,
    session.userId,
    phoneDeps()
  );
  return NextResponse.json(body, { headers, status });
};

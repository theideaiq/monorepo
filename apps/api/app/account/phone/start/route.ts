import { authenticateRequest } from "@repo/auth/verify";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { phoneDeps } from "@/lib/phone-verify";
import { handlePhoneStart } from "@/lib/phone-verify/handler";

export const OPTIONS = preflight;

/**
 * Sends a code (WhatsApp, else SMS) to the number the caller wants to
 * verify. Answers with the number in E.164 and how the code was sent.
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

  const { body, status } = await handlePhoneStart(
    request,
    session.userId,
    phoneDeps()
  );
  return NextResponse.json(body, { headers, status });
};

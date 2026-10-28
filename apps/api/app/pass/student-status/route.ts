import { authenticateRequest } from "@repo/auth/verify";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { corsHeaders, preflight } from "@/lib/cors";
import { forgetStudentStatus } from "@/lib/student-status";

export const OPTIONS = preflight;

/**
 * Deletes the caller's student status ("Your student status" on /verify).
 * A bare Pass, made only for the student check, is deleted with it; the
 * website then signs out.
 */
export const POST = async (request: Request) => {
  const headers = corsHeaders(request);
  const json = (data: object, status = 200) =>
    NextResponse.json(data, { headers, status });

  const session = await authenticateRequest(request);
  if (!session) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const result = await forgetStudentStatus(
      { admin: createAdminClient(), user: session.supabase },
      session.userId
    );
    return json({ ok: true, ...result });
  } catch (error) {
    log.error(`Deleting a student status failed: ${parseError(error)}`);
    return json({ error: "failed" }, 500);
  }
};

import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { sweepStudentChecks } from "@/lib/student-status";

// Daily: forgets student checks after 30 days and deletes bare Passes that
// hold nothing any more.
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const deleted = await sweepStudentChecks(createAdminClient());
    return Response.json({ deleted });
  } catch (error) {
    log.error(`Student check sweep failed: ${parseError(error)}`);
    return new Response("Sweep failed", { status: 500 });
  }
};

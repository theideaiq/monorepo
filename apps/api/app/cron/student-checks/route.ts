import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { sweepStudentChecks } from "@/lib/student-status";
import { deliverWebhooks } from "@/lib/student-verifications";

// Daily: deletes bare Passes that hold nothing any more, sweeps partners'
// student verifications (unfinished, rejected, past 30 June) and retries
// the partner webhooks that failed.
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const admin = createAdminClient();
    const deleted = await sweepStudentChecks(admin);
    const { data: verifications, error } = await admin.rpc(
      "sweep_student_verifications"
    );
    if (error) {
      throw error;
    }
    const delivered = await deliverWebhooks(admin);
    return Response.json({ deleted, delivered, verifications });
  } catch (error) {
    log.error(`Student check sweep failed: ${parseError(error)}`);
    return new Response("Sweep failed", { status: 500 });
  }
};

import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { fetchStatus } from "@repo/observability/status/server";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { countQueues, integrations } from "@/lib/health";
import { jobs } from "@/lib/jobs";
import { requireStaffCaller } from "../_lib/staff";

/**
 * Staff → Settings → Health (admins): which integrations are configured
 * (booleans, never values), the Better Stack monitors, notifications stuck
 * on a channel, and the job catalogue the page checks `job_runs` against.
 * Staff reads `job_runs` itself, as the staff member.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, ["superadmin", "admin"]);
  if (caller instanceof NextResponse) {
    return caller;
  }

  const configured = integrations(env);
  const [status, queues] = await Promise.all([
    fetchStatus(),
    configured.supabase
      ? countQueues(createAdminClient(), configured).catch((error) => {
          log.error(`Health queues failed: ${parseError(error)}`);
          return null;
        })
      : null,
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    integrations: configured,
    jobs,
    queues,
    status,
  });
};

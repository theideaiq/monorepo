import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { sweepProgramDocuments } from "@/lib/program-documents";

/**
 * Daily (10:05 Baghdad): members following an opportunity hear when it opens and three
 * days before its deadline, and listings past their deadline close
 * (`notify_opportunity_followers`, migration 20270303000000_opportunities);
 * then passport scans for The IDEA's programs are deleted 30 days after the
 * application or the program ends (`sweepProgramDocuments`).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("notify_opportunity_followers");
  if (error) {
    log.error(`Opportunity reminders failed: ${parseError(error)}`);
    return NextResponse.json({ error: "reminders_failed" }, { status: 500 });
  }
  try {
    const removed = await sweepProgramDocuments(admin);
    return NextResponse.json({ ok: true, removed, sent: data });
  } catch (sweepError) {
    log.error(`Program documents sweep failed: ${parseError(sweepError)}`);
    return NextResponse.json({ error: "sweep_failed" }, { status: 500 });
  }
};

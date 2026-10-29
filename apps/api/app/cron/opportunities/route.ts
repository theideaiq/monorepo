import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily (10:05 Baghdad): members following an opportunity hear when it opens and three
 * days before its deadline, and listings past their deadline close
 * (`notify_opportunity_followers`, migration 20270303000000_opportunities).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const { data, error } = await createAdminClient().rpc(
    "notify_opportunity_followers"
  );
  if (error) {
    log.error(`Opportunity reminders failed: ${parseError(error)}`);
    return NextResponse.json({ error: "reminders_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, sent: data });
};

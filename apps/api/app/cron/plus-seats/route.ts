import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily: renews the company-paid The IDEA Plus memberships due within three
 * days and invoices each company for them (`run_plus_seat_renewals`,
 * migration 20261208000000_team_plus.sql).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const { data, error } = await createAdminClient().rpc(
    "run_plus_seat_renewals"
  );
  if (error) {
    log.error(`Plus seat renewals failed: ${parseError(error)}`);
    return NextResponse.json({ error: "renewals_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, renewed: data });
};

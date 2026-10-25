import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily: reminds members whose Bulbs will expire in 30 days (11 months
 * without activity) and expires Bulbs after 12 months without activity
 * (`run_bulb_expiry`, migration 20261128000000_bulbs.sql).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const { data, error } = await createAdminClient().rpc("run_bulb_expiry");
  if (error) {
    log.error(`Bulbs expiry failed: ${parseError(error)}`);
    return NextResponse.json({ error: "expiry_failed" }, { status: 500 });
  }
  const result = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ ok: true, ...result });
};

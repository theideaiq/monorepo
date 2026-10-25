import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily: reminds members whose Bulbs will expire in 30 days (11 months
 * without activity), expires Bulbs after 12 months without activity
 * (`run_bulb_expiry`, migration 20261128000000_bulbs.sql) and pays today's
 * birthday bonuses (`run_birthday_bulbs`, 20261205000000_bulbs_extras.sql).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const admin = createAdminClient();
  const [expiry, birthdays] = await Promise.all([
    admin.rpc("run_bulb_expiry"),
    admin.rpc("run_birthday_bulbs"),
  ]);
  if (expiry.error) {
    log.error(`Bulbs expiry failed: ${parseError(expiry.error)}`);
  }
  if (birthdays.error) {
    log.error(`Birthday Bulbs failed: ${parseError(birthdays.error)}`);
  }
  if (expiry.error || birthdays.error) {
    return NextResponse.json({ error: "bulbs_failed" }, { status: 500 });
  }
  const result = Array.isArray(expiry.data) ? expiry.data[0] : expiry.data;
  return NextResponse.json({
    ok: true,
    ...result,
    birthdays: birthdays.data,
  });
};

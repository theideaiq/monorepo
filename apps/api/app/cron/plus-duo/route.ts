import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily, after the renewals: ends Plus Duo places past a removal's
 * renewal or on a Duo that ended or changed plan, and clears expired
 * invites (`end_duo_partners`, migration 20270314000000_plus_duo.sql).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const { data, error } = await createAdminClient().rpc("end_duo_partners");
  if (error) {
    log.error(`Plus Duo sweep failed: ${parseError(error)}`);
    return NextResponse.json({ error: "duo_failed" }, { status: 500 });
  }
  return NextResponse.json({ ended: data, ok: true });
};

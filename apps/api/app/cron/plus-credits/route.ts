import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily: on the 1st of each month (Baghdad), every Plus member gets their
 * tier's free survey response credits and last month's unused ones expire
 * (`grant_plus_survey_credits`, migration
 * 20270223000000_plus_bulbs_credits.sql). Other days it finds nobody new.
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const { data, error } = await createAdminClient().rpc(
    "grant_plus_survey_credits"
  );
  if (error) {
    log.error(`Plus survey credits failed: ${parseError(error)}`);
    return NextResponse.json({ error: "credits_failed" }, { status: 500 });
  }
  return NextResponse.json({ granted: data, ok: true });
};

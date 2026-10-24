import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/** Daily: flags The IDEA Plus rentals past their due date as overdue. */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  try {
    const { data, error } = await createAdminClient().rpc(
      "mark_overdue_rentals"
    );
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({ ok: true, overdue: data ?? 0 });
  } catch (error) {
    log.error(`Overdue rentals job failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};

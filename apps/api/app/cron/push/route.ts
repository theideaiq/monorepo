import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { getPushSender } from "@/lib/push";
import { deliverPushNotifications } from "@/lib/push/deliver";

/**
 * Catch-up for push notifications the database webhook missed (API down,
 * webhook not set up yet): pushes unpushed notifications of the last day.
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const sender = getPushSender();
  if (!sender) {
    return NextResponse.json({ ok: true, skipped: "push_not_configured" });
  }

  try {
    const summary = await deliverPushNotifications(createAdminClient(), sender);
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    log.error(`Push catch-up failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};

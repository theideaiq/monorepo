import { createAdminClient } from "@repo/database/admin";
import { sendEmail } from "@repo/email";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { sendReminders } from "@/lib/reminders";

/**
 * Hourly (`.github/workflows/reminders.yml`) and daily as a safety net:
 * review requests 3 days after delivery and cart reminders 24 hours after
 * a cart is left, by notification and email.
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const sent = await sendReminders({
      admin: createAdminClient(),
      logger: log,
      send: sendEmail,
      webUrl: env.NEXT_PUBLIC_WEB_URL,
    });
    return NextResponse.json({ ok: true, ...sent });
  } catch (error) {
    log.error(`Reminders failed: ${parseError(error)}`);
    return NextResponse.json({ error: "reminders_failed" }, { status: 500 });
  }
};

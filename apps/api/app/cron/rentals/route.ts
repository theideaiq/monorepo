import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Daily: flags The IDEA Plus rentals past their due date as overdue, and
 * writes a "due soon" notification for rentals due within two days (once
 * per due date). Notifications go out as push and, for customers who opted
 * in, on WhatsApp (POST /webhooks/notifications, GET /cron/push).
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  try {
    const admin = createAdminClient();
    const { data: overdue, error } = await admin.rpc("mark_overdue_rentals");
    if (error) {
      throw new Error(error.message);
    }
    const { data: reminded, error: reminderError } = await admin.rpc(
      "notify_rentals_due_soon"
    );
    if (reminderError) {
      throw new Error(reminderError.message);
    }
    // Expired Plus invites pass to the next person on the waitlist.
    const { data: invited, error: waitlistError } =
      await admin.rpc("run_plus_waitlist");
    if (waitlistError) {
      throw new Error(waitlistError.message);
    }
    // Games for kits whose weekend starts within two days.
    const { data: kitGames, error: kitError } =
      await admin.rpc("run_kit_holds");
    if (kitError) {
      throw new Error(kitError.message);
    }
    return NextResponse.json({
      dueSoon: reminded ?? 0,
      invited: invited ?? 0,
      kitGames: kitGames ?? 0,
      ok: true,
      overdue: overdue ?? 0,
    });
  } catch (error) {
    log.error(`Rentals job failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};

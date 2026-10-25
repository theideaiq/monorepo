import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { getBoxy, refreshAreas, syncOpenShipments } from "@/lib/boxy/service";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";

/**
 * Follows the parcels with Boxy: reads every live parcel that isn't
 * delivered or returned (Boxy's webhooks stop at "in transit"), and with
 * `?areas=1` (the daily run) refreshes the checkout's delivery areas.
 * Vercel Cron runs it daily; a GitHub Actions schedule runs it every 15
 * minutes (.github/workflows/boxy-sync.yml).
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  const boxy = getBoxy();
  if (!boxy) {
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }
  try {
    const admin = createAdminClient();
    const withAreas = new URL(request.url).searchParams.get("areas") === "1";
    const areas = withAreas ? await refreshAreas(admin, boxy) : null;
    const shipments = await syncOpenShipments(admin, boxy);
    return NextResponse.json({ areas, ok: true, shipments });
  } catch (error) {
    log.error(`Boxy sync failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};

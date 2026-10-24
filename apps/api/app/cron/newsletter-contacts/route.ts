import { createAdminClient } from "@repo/database/admin";
import { resend } from "@repo/email";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { syncNewsletterContacts } from "@/lib/newsletter";

// Resend allows a few requests a second, so a big first sync takes several
// runs; each run stops starting requests well before this limit.
export const maxDuration = 300;

const BUDGET_MS = 240_000;

/**
 * Daily: syncs every account with an email to the Resend segment that
 * newsletters (Resend Broadcasts) go to, and pulls unsubscribes made in
 * Resend back into `profiles.marketing_opt_in` (see lib/newsletter.ts).
 * Off until `RESEND_TOKEN` and `RESEND_SEGMENT_ID` are set.
 */
export const GET = async (request: Request): Promise<Response> => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }

  const segmentId = env.RESEND_SEGMENT_ID;
  if (!(resend && segmentId)) {
    return NextResponse.json({ ok: true, skipped: "not_configured" });
  }

  try {
    const result = await syncNewsletterContacts({
      admin: createAdminClient(),
      contacts: resend.contacts,
      deadline: Date.now() + BUDGET_MS,
      segmentId,
    });
    if (result.failed > 0) {
      log.warn(
        `Newsletter sync: ${result.failed} Resend requests failed`,
        result
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    log.error(`Newsletter sync failed: ${parseError(error)}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
};

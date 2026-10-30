import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { isAuthorizedCronRequest, unauthorized } from "@/lib/cron";
import { buyDigitalCodes, reloadlyFromEnv } from "@/lib/digital-codes";

/**
 * Daily, as a safety net: buys the digital codes still waiting (each is
 * bought right after its payment, and when Staff release or retry one).
 */
export const GET = async (request: Request) => {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorized();
  }
  try {
    const run = await buyDigitalCodes({
      admin: createAdminClient(),
      logger: log,
      reloadly: reloadlyFromEnv(),
    });
    return NextResponse.json({ ok: true, ...run });
  } catch (error) {
    log.error(`Digital codes failed: ${parseError(error)}`);
    return NextResponse.json(
      { error: "digital_codes_failed" },
      { status: 500 }
    );
  }
};

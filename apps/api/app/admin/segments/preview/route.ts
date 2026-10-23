import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { segmentCriteria, resolveRecipients } from "../../_lib/recipients";
import { requireStaffCaller } from "../../_lib/staff";

const body = z.object({ criteria: segmentCriteria });

/**
 * How many customers a segment would reach right now (opted in, with an
 * email, matching the criteria). Marketing staff only; returns a count,
 * never the addresses.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, [
    "marketing",
    "admin",
    "superadmin",
  ]);
  if (caller instanceof NextResponse) {
    return caller;
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const recipients = await resolveRecipients(
      createAdminClient(),
      parsed.data.criteria
    );
    return NextResponse.json({ count: recipients.length });
  } catch (error) {
    log.error(`Segment preview failed: ${parseError(error)}`);
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
};

import { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { buyDigitalCodes, reloadlyFromEnv } from "@/lib/digital-codes";
import { requireStaffCaller } from "../_lib/staff";

const ROLES = ["superadmin", "admin", "finance", "support"] as const;

/**
 * Buys the digital codes waiting now (Staff → Orders → Digital codes, after
 * releasing a hold or retrying a failed code).
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, ROLES);
  if (caller instanceof NextResponse) {
    return caller;
  }
  const reloadly = reloadlyFromEnv();
  if (!reloadly) {
    return NextResponse.json(
      { error: "supplier_not_configured" },
      { status: 503 }
    );
  }
  try {
    const run = await buyDigitalCodes({
      admin: createAdminClient(),
      logger: log,
      reloadly,
    });
    return NextResponse.json(run);
  } catch {
    return NextResponse.json(
      { error: "digital_codes_failed" },
      { status: 502 }
    );
  }
};

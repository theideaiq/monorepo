import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { reloadlyFromEnv, syncReloadlyCatalog } from "@/lib/digital-codes";
import { requireStaffCaller } from "../../_lib/staff";

const ROLES = ["superadmin", "admin", "finance"] as const;

/** Reads Reloadly's catalog into brands and denominations (Finance → Codes). */
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
    return NextResponse.json(
      await syncReloadlyCatalog({ admin: createAdminClient(), reloadly })
    );
  } catch (error) {
    log.error(`Reloadly catalog sync failed: ${parseError(error)}`);
    return NextResponse.json({ error: "digital_sync_failed" }, { status: 502 });
  }
};

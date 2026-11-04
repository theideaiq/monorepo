import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { requireStaffCaller } from "../../_lib/staff";

/**
 * Staff → Settings → Handover (superadmins): whether each staff member has
 * a verified authenticator app (TOTP factor). Factors live in Auth, which
 * only the admin client reads; only a yes or no per staff member leaves
 * the API, never a factor's id, name or secret.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, ["superadmin"]);
  if (caller instanceof NextResponse) {
    return caller;
  }

  try {
    const admin = createAdminClient();
    const { data: staff, error } = await admin.from("staff").select("user_id");
    if (error) {
      throw new Error(error.message);
    }
    const entries = await Promise.all(
      (staff ?? []).map(async ({ user_id: userId }) => {
        const { data, error: factorsError } =
          await admin.auth.admin.mfa.listFactors({ userId });
        if (factorsError) {
          throw new Error(factorsError.message);
        }
        const hasApp = (data?.factors ?? []).some(
          (factor) =>
            factor.factor_type === "totp" && factor.status === "verified"
        );
        return [userId, hasApp] as const;
      })
    );
    return NextResponse.json({ authenticator: Object.fromEntries(entries) });
  } catch (error) {
    log.error(`Staff factors failed: ${parseError(error)}`);
    return NextResponse.json({ error: "factors_failed" }, { status: 502 });
  }
};

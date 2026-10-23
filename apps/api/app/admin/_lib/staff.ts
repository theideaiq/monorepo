import "server-only";

import { authenticateRequest } from "@repo/auth/verify";
import type { StaffRole } from "@repo/database";
import { NextResponse } from "next/server";

export type StaffCaller = NonNullable<
  Awaited<ReturnType<typeof authenticateRequest>>
> & { role: StaffRole };

/**
 * MFA can be skipped only under `next dev`, where the local Supabase stack
 * has TOTP disabled. The back office itself enforces the same rule.
 */
const requiresAal2 = () => process.env.NODE_ENV !== "development";

/**
 * Back-office endpoints: the caller sends their access token (Bearer), must
 * have signed in with their authenticator app (AAL2) and hold one of
 * `roles`. Returns the caller, or the error response to send.
 */
export const requireStaffCaller = async (
  request: Request,
  roles: readonly StaffRole[]
): Promise<StaffCaller | NextResponse> => {
  const session = await authenticateRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (requiresAal2() && session.claims.aal !== "aal2") {
    return NextResponse.json({ error: "mfa_required" }, { status: 403 });
  }

  // Read as the caller: RLS shows a user their own staff row.
  const { data } = await session.supabase
    .from("staff")
    .select("role")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (!(data && roles.includes(data.role))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return { ...session, role: data.role };
};

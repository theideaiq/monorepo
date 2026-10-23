import { normalizePhone } from "@repo/auth/phone";
import { createAdminClient } from "@repo/database/admin";
import { parseError } from "@repo/observability/error";
import { log } from "@repo/observability/log";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStaffCaller } from "../../_lib/staff";

const body = z.object({ query: z.string().trim().min(3).max(320) });

const PAGE = 1000;
const NON_DIGITS = /\D/g;

/** "+964 770…" or "0770…" → "9647…" (how Auth stores phone numbers). */
const phoneDigits = (value: string) =>
  (normalizePhone(value) ?? "").replace(NON_DIGITS, "");

/**
 * Finds an account by phone number or email so a superadmin can grant it a
 * staff role (emails and phone numbers live in auth.users, which only the
 * admin client can read). Superadmins only.
 */
export const POST = async (request: Request) => {
  const caller = await requireStaffCaller(request, ["superadmin"]);
  if (caller instanceof NextResponse) {
    return caller;
  }

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const query = parsed.data.query;
  const email = query.includes("@") ? query.toLowerCase() : null;
  const phone = email ? null : phoneDigits(query);
  if (!(email || phone)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    for (let page = 1; ; page += 1) {
      // biome-ignore lint/performance/noAwaitInLoops: pages are sequential
      const { data, error } = await admin.auth.admin.listUsers({
        page,
        perPage: PAGE,
      });
      if (error) {
        throw new Error(error.message);
      }
      const user = data.users.find((candidate) =>
        email
          ? candidate.email?.toLowerCase() === email
          : (candidate.phone ?? "").replace(NON_DIGITS, "") === phone
      );
      if (user) {
        const [{ data: profile }, { data: staff }] = await Promise.all([
          admin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
          admin
            .from("staff")
            .select("role, title")
            .eq("user_id", user.id)
            .maybeSingle(),
        ]);
        return NextResponse.json({
          user: {
            email: user.email ?? null,
            fullName: profile?.full_name ?? null,
            id: user.id,
            phone: user.phone ? `+${user.phone.replace(NON_DIGITS, "")}` : null,
            staffRole: staff?.role ?? null,
            staffTitle: staff?.title ?? null,
          },
        });
      }
      if (data.users.length < PAGE) {
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      }
    }
  } catch (error) {
    log.error(`Staff lookup failed: ${parseError(error)}`);
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
};

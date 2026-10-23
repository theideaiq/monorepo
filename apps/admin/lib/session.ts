import "server-only";

import { createClient } from "@repo/auth/server";
import type { StaffRole } from "@repo/database";
import { redirect } from "@repo/internationalization/navigation";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { env } from "@/env";
import { type AccessLevel, accessTo, type Section } from "./roles";

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

export interface StaffMember {
  name: string | null;
  role: StaffRole;
  title: string | null;
  userId: string;
}

export type SessionState =
  | { status: "signed-out" }
  | { status: "not-staff"; supabase: ServerClient; userId: string }
  | {
      factors: { id: string; verified: boolean }[];
      status: "needs-mfa";
      staff: StaffMember;
      supabase: ServerClient;
    }
  | { status: "ready"; staff: StaffMember; supabase: ServerClient };

/** MFA can only be skipped under `next dev` with ADMIN_SKIP_MFA=true. */
export const mfaSkipped = () =>
  process.env.NODE_ENV === "development" && env.ADMIN_SKIP_MFA === "true";

/**
 * Who is signed in and whether they may use the back office: a verified user
 * (checked with the Auth server), a `staff` row (read under RLS, so users
 * only ever see their own) and a session at AAL2 (authenticator app).
 * Cached per request.
 */
export const getSession = cache(async (): Promise<SessionState> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { status: "signed-out" };
  }

  const [{ data: staffRow }, { data: profile }] = await Promise.all([
    supabase
      .from("staff")
      .select("role, title")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  if (!staffRow) {
    return { status: "not-staff", supabase, userId: user.id };
  }

  const staff: StaffMember = {
    name: profile?.full_name ?? null,
    role: staffRow.role,
    title: staffRow.title,
    userId: user.id,
  };

  if (!mfaSkipped()) {
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aal?.currentLevel !== "aal2") {
      const totp = (user.factors ?? []).filter(
        (factor) => factor.factor_type === "totp"
      );
      return {
        factors: totp.map((factor) => ({
          id: factor.id,
          verified: factor.status === "verified",
        })),
        staff,
        status: "needs-mfa",
        supabase,
      };
    }
  }

  return { staff, status: "ready", supabase };
});

const redirectTo = async (href: string): Promise<never> =>
  redirect({ href, locale: await getLocale() });

/** For pages: sends visitors to sign-in, MFA or the no-access page. */
export const requireStaff = async () => {
  const session = await getSession();

  switch (session.status) {
    case "signed-out":
      return redirectTo("/sign-in");
    case "not-staff":
      return redirectTo("/no-access");
    case "needs-mfa":
      return redirectTo("/mfa");
    default:
      return session;
  }
};

/** For pages of a section; renders 404 when the role can't open it. */
export const requireSection = async (
  section: Section,
  level: AccessLevel = "read"
) => {
  const session = await requireStaff();
  const access = accessTo(session.staff.role, section);

  if (!access || (level === "write" && access !== "write")) {
    notFound();
  }

  return { ...session, canWrite: access === "write" };
};

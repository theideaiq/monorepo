import "server-only";

import { createClient } from "@repo/auth/server";
import type { StaffRole } from "@repo/database";
import { notFound, redirect as redirectToUrl } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";
import { redirect } from "@/lib/admin/navigation";
import { passLink } from "./pass";
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
  | { status: "needs-mfa"; staff: StaffMember; supabase: ServerClient }
  | { status: "ready"; staff: StaffMember; supabase: ServerClient };

/**
 * Who is signed in and whether they may use Staff: a verified user
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

  const { data: aal } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (aal?.currentLevel !== "aal2") {
    return { staff, status: "needs-mfa", supabase };
  }

  return { staff, status: "ready", supabase };
});

const redirectTo = async (href: string): Promise<never> =>
  redirect({ href, locale: await getLocale() });

/**
 * Sign-in and the authenticator app live on The IDEA Pass, which comes back
 * to Staff afterwards.
 */
export const redirectToPass = async (path: "/mfa" | "/sign-in") =>
  redirectToUrl(passLink(path, await getLocale()));

/**
 * For pages: sends visitors to The IDEA Pass (sign-in, or the authenticator
 * app for staff on AAL1) or to the no-access page.
 */
export const requireStaff = async () => {
  const session = await getSession();

  switch (session.status) {
    case "signed-out":
      return redirectToPass("/sign-in");
    case "not-staff":
      return redirectTo("/no-access");
    case "needs-mfa":
      return redirectToPass("/mfa");
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

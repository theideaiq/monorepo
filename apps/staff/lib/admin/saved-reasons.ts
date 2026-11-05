"use server";

import { z } from "zod";
import { getSession } from "./session";

/** The Inbox kinds whose decisions take a reason (`staff_saved_reasons.kind`). */
const KINDS = [
  "applications",
  "checks",
  "returns",
  "shops",
  "submissions",
  "verifications",
] as const;

export type ReasonKind = (typeof KINDS)[number];

export interface SavedReason {
  body: string;
  id: string;
  /** Whether the viewer may remove it (theirs, or they are an admin). */
  removable: boolean;
}

const kind = z.enum(KINDS);
const body = z.string().trim().min(3).max(500);

/**
 * The saved reasons for a kind of decision, oldest first, read as the staff
 * member (RLS: staff with an authenticator-app session). Empty when not
 * signed in as staff.
 */
export const listSavedReasons = async (
  forKind: ReasonKind
): Promise<SavedReason[]> => {
  const session = await getSession();
  const parsed = kind.safeParse(forKind);
  if (session.status !== "ready" || !parsed.success) {
    return [];
  }
  const { data } = await session.supabase
    .from("staff_saved_reasons")
    .select("id, body, created_by")
    .eq("kind", parsed.data)
    .order("created_at");
  const admin = ["admin", "superadmin"].includes(session.staff.role);
  return (data ?? []).map((row) => ({
    body: row.body,
    id: row.id,
    removable: admin || row.created_by === session.staff.userId,
  }));
};

/** Saves a reason for the kind, as the staff member; a repeat is ignored. */
export const saveReason = async (
  forKind: ReasonKind,
  text: string
): Promise<boolean> => {
  const session = await getSession();
  const parsed = z
    .object({ body, kind })
    .safeParse({ body: text, kind: forKind });
  if (session.status !== "ready" || !parsed.success) {
    return false;
  }
  const { error } = await session.supabase.from("staff_saved_reasons").upsert(
    {
      body: parsed.data.body,
      created_by: session.staff.userId,
      kind: parsed.data.kind,
    },
    { ignoreDuplicates: true, onConflict: "kind,body" }
  );
  return !error;
};

/** Removes a saved reason (RLS: its author or an admin). */
export const removeReason = async (id: string): Promise<boolean> => {
  const session = await getSession();
  const parsed = z.uuid().safeParse(id);
  if (session.status !== "ready" || !parsed.success) {
    return false;
  }
  const { error } = await session.supabase
    .from("staff_saved_reasons")
    .delete()
    .eq("id", parsed.data);
  return !error;
};

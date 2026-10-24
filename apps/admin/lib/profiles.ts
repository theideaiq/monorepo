import "server-only";

import type { ServerClient } from "./session";

/**
 * Display names for user ids (staff can read every profile). Tables point at
 * auth.users, so PostgREST can't embed profiles; this is one extra query.
 */
export const profileNames = async (
  supabase: ServerClient,
  ids: (string | null | undefined)[]
) => {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const names = new Map<string, string | null>();
  if (unique.length === 0) {
    return names;
  }
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", unique.slice(0, 500));
  for (const row of data ?? []) {
    names.set(row.id, row.full_name);
  }
  return names;
};

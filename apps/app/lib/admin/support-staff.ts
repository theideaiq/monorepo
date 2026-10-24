import "server-only";

import { profileNames } from "./profiles";
import type { ServerClient } from "./session";

/** Staff who can work tickets (support, admins, superadmins), by name. */
export const supportStaff = async (supabase: ServerClient) => {
  const { data } = await supabase
    .from("staff")
    .select("user_id, role")
    .in("role", ["support", "admin", "superadmin"]);
  const rows = data ?? [];
  const names = await profileNames(
    supabase,
    rows.map((row) => row.user_id)
  );
  return rows
    .map((row) => ({
      id: row.user_id,
      name: names.get(row.user_id) ?? null,
      role: row.role,
    }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
};

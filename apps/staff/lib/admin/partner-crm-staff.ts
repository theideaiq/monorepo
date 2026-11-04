import "server-only";

import { crmRoles } from "./partner-crm";
import { profileNames } from "./profiles";
import type { ServerClient } from "./session";

export interface CrmStaffMember {
  id: string;
  name: string | null;
}

/**
 * The staff who can own a partner organization (those who can read the
 * CRM: editors, marketing and admins), by name.
 */
export const crmStaff = async (
  supabase: ServerClient
): Promise<CrmStaffMember[]> => {
  const { data } = await supabase
    .from("staff")
    .select("user_id")
    .in("role", [...crmRoles]);
  const rows = data ?? [];
  const names = await profileNames(
    supabase,
    rows.map((row) => row.user_id)
  );
  return rows
    .map((row) => ({ id: row.user_id, name: names.get(row.user_id) ?? null }))
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
};

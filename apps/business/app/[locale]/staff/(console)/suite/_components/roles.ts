import type { StaffRole } from "@repo/database";

/** Support writes quotes and handles orders; finance invoices. */
export const suiteAbilities = (role: StaffRole) => {
  const all = role === "superadmin" || role === "admin";
  return {
    invoices: all || role === "finance",
    quotes: all || role === "support",
  };
};

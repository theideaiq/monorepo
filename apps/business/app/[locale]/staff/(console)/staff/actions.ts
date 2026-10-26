"use server";

import type { StaffRole } from "@repo/database";
import { z } from "zod";
import { ActionFailure, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
import { optionalText, uuid } from "@/lib/admin/forms";
import { staffRoles } from "@/lib/admin/roles";

export interface FoundUser {
  email: string | null;
  fullName: string | null;
  id: string;
  phone: string | null;
  staffRole: StaffRole | null;
  staffTitle: string | null;
}

/** Finds a The IDEA Pass by phone or email (apps/api reads auth.users). */
export const lookupUser = staffAction(
  "staff",
  z.object({ query: z.string().trim().min(3).max(320) }),
  async ({ input, supabase }) => {
    const result = await callApi<{ user: FoundUser }>(
      supabase,
      "/admin/staff/lookup",
      { query: input.query }
    );
    if (!result.ok) {
      if (result.status === 0) {
        throw new ActionFailure("apiUnavailable");
      }
      if (result.status === 404) {
        throw new ActionFailure("notFound");
      }
      if (result.status === 400) {
        throw new ActionFailure("invalid");
      }
      throw new ActionFailure(result.status === 403 ? "forbidden" : "unknown");
    }
    return success("saved", { data: { user: result.data.user } });
  }
);

/** Grants or changes a role (`set_staff_role`, superadmins only). */
export const setStaffRole = staffAction(
  "staff",
  z.object({
    role: z.enum(staffRoles),
    title: optionalText(120),
    userId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_staff_role", {
        new_role: input.role,
        staff_title: input.title ?? undefined,
        target: input.userId,
      })
    );
    return success();
  }
);

/** Revokes a staff role; the last superadmin can't be removed. */
export const revokeStaff = staffAction(
  "staff",
  z.object({ userId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("set_staff_role", {
        // The function revokes when the role is null.
        new_role: null as unknown as StaffRole,
        target: input.userId,
      })
    );
    return success("deleted");
  }
);

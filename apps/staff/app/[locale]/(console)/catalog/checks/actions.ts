"use server";

import { z } from "zod";
import { affected, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";

const idSchema = z.object({ id: z.uuid() });

/** Marks what an automatic check found as dealt with (merged or fixed). */
export const resolveProductCheck = staffAction(
  "catalog",
  idSchema,
  async ({ input, staff, supabase }) => {
    affected(
      await supabase
        .from("product_checks")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: staff.userId,
        })
        .eq("id", input.id)
        .is("resolved_at", null)
        .select("id")
    );
    return success();
  }
);

/** Marks a shop's flag on wrong details as dealt with. */
export const resolveProductFlag = staffAction(
  "catalog",
  idSchema,
  async ({ input, staff, supabase }) => {
    affected(
      await supabase
        .from("product_flags")
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: staff.userId,
        })
        .eq("id", input.id)
        .is("resolved_at", null)
        .select("id")
    );
    return success();
  }
);

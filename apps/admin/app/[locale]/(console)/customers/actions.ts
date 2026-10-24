"use server";

import { z } from "zod";
import { ActionFailure, affected, check, staffAction } from "@/lib/action";
import { crmContactSchema, markContactedSchema } from "@/lib/crm";
import { checkbox, uuid } from "@/lib/forms";

export const saveCrmContact = staffAction(
  "customers",
  crmContactSchema,
  async ({ input, supabase, staff }) => {
    check(
      await supabase.from("crm_contacts").upsert({
        last_contacted_at: input.lastContactedAt,
        notes: input.notes,
        status: input.status,
        tags: input.tags,
        updated_by: staff.userId,
        user_id: input.userId,
      })
    );
  }
);

/** "Contacted today": stamps the CRM record with the current time. */
export const markContacted = staffAction(
  "customers",
  markContactedSchema,
  async ({ input, supabase, staff }) => {
    check(
      await supabase.from("crm_contacts").upsert({
        last_contacted_at: new Date().toISOString(),
        updated_by: staff.userId,
        user_id: input.userId,
      })
    );
  }
);

/**
 * Suspends a customer from ordering, renting, RSVPs and submissions (the
 * RPCs and policies check `banned_at`), or lifts the suspension. Staff
 * accounts are managed on the Staff page instead.
 */
export const setSuspended = staffAction(
  "customers",
  z.object({ suspend: checkbox, userId: uuid }),
  async ({ input, supabase, staff }) => {
    if (input.userId === staff.userId) {
      throw new ActionFailure("forbidden");
    }
    const { data: target } = await supabase
      .from("staff")
      .select("user_id")
      .eq("user_id", input.userId)
      .maybeSingle();
    if (target) {
      throw new ActionFailure("forbidden");
    }
    affected(
      await supabase
        .from("profiles")
        .update({ banned_at: input.suspend ? new Date().toISOString() : null })
        .eq("id", input.userId)
        .select("id")
    );
  }
);

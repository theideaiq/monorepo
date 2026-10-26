"use server";

import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { crmContactSchema, markContactedSchema } from "@/lib/admin/crm";
import { checkbox, uuid } from "@/lib/admin/forms";
import { scannedPass } from "@/lib/admin/pass-code";

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

export interface CheckedPass {
  memberNumber: number | null;
  memberSince: string | null;
  name: string | null;
  userId: string | null;
  valid: boolean;
}

/**
 * Checks a The IDEA Pass card at the counter: the scanned QR code
 * (`IDEA:<member number>:<code>`), or the member number and the 6-digit
 * code typed in. `check_pass` accepts only a current code.
 */
export const checkPass = staffAction(
  "customers",
  z.object({
    code: z.string().trim().max(64).optional(),
    scanned: z.string().trim().max(200).optional(),
  }),
  async ({ input, supabase }) => {
    const { data } = check(
      await supabase.rpc("check_pass", {
        scanned: scannedPass(input.scanned, input.code),
      })
    );
    const row = data?.[0];
    const result: CheckedPass = {
      memberNumber: row?.member_number ?? null,
      memberSince: row?.member_since ?? null,
      name: row?.full_name ?? null,
      userId: row?.user_id ?? null,
      valid: row?.valid ?? false,
    };
    return success("saved", { data: { pass: result } });
  }
);

/**
 * Adds or takes away a member's Bulbs with a reason (`adjust_bulbs`: support
 * and finance staff; audited).
 */
export const adjustBulbs = staffAction(
  "customers",
  z.object({
    bulbs: z
      .string()
      .trim()
      .regex(/^[-−]?\d{1,6}$/)
      .transform((value) => Number(value.replace("−", "-")))
      .refine((value) => value !== 0),
    reason: z.string().trim().min(3).max(300),
    userId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("adjust_bulbs", {
        bulbs: input.bulbs,
        member: input.userId,
        why: input.reason,
      })
    );
    return success();
  }
);

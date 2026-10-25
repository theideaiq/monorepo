"use server";

import { z } from "zod";
import { ActionFailure, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { AFFILIATE_CODE } from "@/lib/admin/affiliates";
import { choice, decimalIn, optionalText, uuid } from "@/lib/admin/forms";

/**
 * Affiliate steps, run as the staff member: marketing approves, rejects or
 * suspends (`decide_affiliate`), finance records payouts and sets the
 * commission rates. The database checks the role for each.
 */

export const decideAffiliate = staffAction(
  "affiliates",
  z.object({
    code: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.union([z.literal(""), z.string().regex(AFFILIATE_CODE)])),
    decision: choice(["approved", "rejected", "suspended"] as const),
    note: optionalText(1000),
    userId: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("decide_affiliate", {
        code: input.code || undefined,
        decision: input.decision,
        member: input.userId,
        note: input.note ?? undefined,
      })
    );
    return success();
  }
);

export const recordPayout = staffAction(
  "affiliates",
  z.object({ reference: optionalText(200), userId: uuid }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("record_affiliate_payout", {
        affiliate: input.userId,
        reference: input.reference ?? undefined,
      })
    );
    return success();
  }
);

export const saveAffiliateRates = staffAction(
  "affiliates",
  z.object({}).catchall(z.string()),
  async ({ input, supabase }) => {
    const rates: Record<string, number> = {};
    for (const [key, value] of Object.entries(input)) {
      if (key.startsWith("rate:")) {
        const parsed = decimalIn(0, 50).safeParse(value);
        if (!parsed.success) {
          throw new ActionFailure("invalid");
        }
        rates[key.slice("rate:".length)] = parsed.data;
      }
    }
    check(await supabase.rpc("set_affiliate_rates", { rates }));
    return success();
  }
);

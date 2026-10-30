"use server";

import { z } from "zod";
import { check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { decimalIn, optionalText, text, uuid } from "@/lib/admin/forms";

/**
 * Staff → Finance → Affiliates. Marketing and finance approve (with the
 * code), refuse, suspend or restore (`decide_affiliate`); finance sets the
 * commission rates and records payouts (`record_affiliate_payout`). The
 * database checks each role.
 */

export const decideAffiliate = staffAction(
  "affiliates",
  z.object({
    code: optionalText(20).transform((value) =>
      value ? value.toUpperCase().replace(/\s/g, "") : null
    ),
    decision: z.enum(["approved", "rejected", "suspended"]),
    note: optionalText(1000),
    org: uuid,
  }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("decide_affiliate", {
        code: input.code ?? undefined,
        decision: input.decision,
        note: input.note ?? undefined,
        org: input.org,
      })
    );
    return success();
  }
);

export const setAffiliateRate = staffAction(
  "affiliates",
  z.object({
    family: z.string().regex(/^[a-z-]{2,40}$/),
    rate: decimalIn(0, 30),
  }),
  async ({ input, supabase }) => {
    check(
      await supabase
        .from("affiliate_rates")
        .upsert({ family: input.family, rate: input.rate })
    );
    return success();
  }
);

export const recordAffiliatePayout = staffAction(
  "affiliates",
  z.object({ org: uuid, reference: text(200) }),
  async ({ input, supabase }) => {
    check(
      await supabase.rpc("record_affiliate_payout", {
        org: input.org,
        reference: input.reference,
      })
    );
    return success();
  }
);

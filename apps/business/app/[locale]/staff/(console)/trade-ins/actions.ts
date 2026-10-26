"use server";

import { affected, check, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { canWrite } from "@/lib/admin/roles";
import {
  completeSchema,
  offerSchema,
  rejectSchema,
  reviewSchema,
} from "@/lib/admin/trade-ins";

/**
 * Trade-in moves, run as the staff member (RLS and the guard trigger check
 * each one). A new offer notifies the customer (push, and WhatsApp when
 * they opted in).
 */

export const markReviewing = staffAction(
  "tradeIns",
  reviewSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("trade_ins")
        .update({ status: "reviewing" })
        .eq("id", input.tradeInId)
        .select("id")
    );
    return success();
  }
);

export const makeOffer = staffAction(
  "tradeIns",
  offerSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("trade_ins")
        .update({
          offer_amount: input.amount,
          offer_note: input.note,
          status: "offer_made",
        })
        .eq("id", input.tradeInId)
        .select("id")
    );
    return success("sent");
  }
);

export const rejectTradeIn = staffAction(
  "tradeIns",
  rejectSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("trade_ins")
        .update({ offer_note: input.note, status: "rejected" })
        .eq("id", input.tradeInId)
        .select("id")
    );
    return success();
  }
);

/**
 * Completes an accepted trade. The draft product (if asked for) opens in
 * the catalog when the staff member can edit it.
 */
export const completeTradeIn = staffAction(
  "tradeIns",
  completeSchema,
  async ({ input, staff, supabase }) => {
    const { data: productId } = check(
      await supabase.rpc("complete_trade_in", {
        create_product: input.createProduct,
        trade_in: input.tradeInId,
      })
    );
    return success(
      "saved",
      productId && canWrite(staff.role, "catalog")
        ? { redirectTo: `/catalog/products/${productId}` }
        : {}
    );
  }
);

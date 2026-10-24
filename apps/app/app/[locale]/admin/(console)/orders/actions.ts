"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import { ActionFailure, affected, staffAction } from "@/lib/admin/action";
import { checkbox, optionalText, uuid } from "@/lib/admin/forms";
import { nextOrderStatuses } from "@/lib/admin/fulfilment";

/**
 * Moves an order through fulfilment. The database guard
 * (`private.guard_order_status`) only accepts these moves for staff; the
 * check here gives a clear message first.
 */
export const setOrderStatus = staffAction(
  "orders",
  z.object({
    cash: checkbox,
    from: z.enum(Constants.public.Enums.order_status),
    id: uuid,
    paid: checkbox,
    status: z.enum(Constants.public.Enums.order_status),
  }),
  async ({ input, supabase }) => {
    const unpaid = { cash: input.cash, paid: input.paid };
    if (!nextOrderStatuses(input.from, unpaid).includes(input.status)) {
      throw new ActionFailure("transition");
    }
    affected(
      await supabase
        .from("orders")
        .update({ status: input.status })
        .eq("id", input.id)
        // Only if nobody changed it in the meantime.
        .eq("status", input.from)
        .select("id")
    );
  }
);

export const saveOrderNotes = staffAction(
  "orders",
  z.object({
    id: uuid,
    staffNote: optionalText(2000),
    trackingNumber: optionalText(120),
  }),
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("orders")
        .update({
          staff_note: input.staffNote,
          tracking_number: input.trackingNumber,
        })
        .eq("id", input.id)
        .select("id")
    );
  }
);

/**
 * Records the cash of a cash order (on delivery or at pickup): the order is
 * marked paid and delivered and a cash payment is recorded for finance, by
 * `mark_cash_collected`, which checks the staff role itself.
 */
export const markCashCollected = staffAction(
  "orders",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const { error } = await supabase.rpc("mark_cash_collected", {
      order_id: input.id,
    });
    if (error) {
      throw new ActionFailure("transition");
    }
  }
);

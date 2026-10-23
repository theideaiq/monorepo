"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import { ActionFailure, affected, staffAction } from "@/lib/action";
import { optionalText, uuid } from "@/lib/forms";
import { nextOrderStatuses } from "@/lib/fulfilment";

/**
 * Moves an order through fulfilment. The database guard
 * (`private.guard_order_status`) only accepts these moves for staff; the
 * check here gives a clear message first.
 */
export const setOrderStatus = staffAction(
  "orders",
  z.object({
    from: z.enum(Constants.public.Enums.order_status),
    id: uuid,
    status: z.enum(Constants.public.Enums.order_status),
  }),
  async ({ input, supabase }) => {
    if (!nextOrderStatuses(input.from).includes(input.status)) {
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
    return undefined;
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
    return undefined;
  }
);

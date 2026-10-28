"use server";

import { Constants } from "@repo/database";
import { z } from "zod";
import { ActionFailure, affected, staffAction } from "@/lib/admin/action";
import { type ActionError, success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
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

/** apps/api's shipment errors as staff messages. */
const SHIPMENT_ERRORS: Record<string, ActionError> = {
  already_shipped: "notShippable",
  carrier_not_configured: "carrierNotConfigured",
  carrier_rejected: "carrierRejected",
  carrier_unavailable: "apiUnavailable",
  forbidden: "forbidden",
  no_area: "noDeliveryArea",
  not_cancellable: "notCancellable",
  not_found: "notFound",
  not_shippable: "notShippable",
  unavailable: "apiUnavailable",
};

const shipmentCall = async <T>(
  supabase: Parameters<typeof callApi>[0],
  path: string,
  body: unknown
) => {
  const result = await callApi<T>(supabase, path, body);
  if (!result.ok) {
    throw new ActionFailure(SHIPMENT_ERRORS[result.error] ?? "unknown");
  }
  return result.data;
};

/**
 * Sends a packed order with Boxy (apps/api holds the Boxy key): the parcel
 * is created, a pick-up requested and the order marked shipped.
 */
export const sendWithBoxy = staffAction(
  "orders",
  z.object({
    fragile: checkbox,
    id: uuid,
    size: z.enum(["S", "M", "L"]),
  }),
  async ({ input, supabase }) => {
    await shipmentCall(supabase, "/admin/shipments", {
      fragile: input.fragile,
      orderId: input.id,
      size: input.size,
    });
    return success("sent");
  }
);

/** Cancels the order's Boxy parcel (before it is collected). */
export const cancelBoxyShipment = staffAction(
  "orders",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    await shipmentCall(supabase, "/admin/shipments/cancel", {
      orderId: input.id,
    });
  }
);

/** Reads the order's parcel from Boxy now. */
export const refreshBoxyShipment = staffAction(
  "orders",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    await shipmentCall(supabase, "/admin/shipments/sync", {
      orderId: input.id,
    });
  }
);

/** The parcel's label: a PDF (base64) or Boxy's link to it. */
export const getBoxyLabel = staffAction(
  "orders",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const label = await shipmentCall<{ pdf?: string; url?: string }>(
      supabase,
      "/admin/shipments/label",
      { orderId: input.id }
    );
    return success("saved", { data: label });
  }
);

/** Marks a shop's cancelled paid line refunded (finance; the database checks). */
export const markLineRefunded = staffAction(
  "orders",
  z.object({ id: uuid }),
  async ({ input, supabase }) => {
    const { error } = await supabase.rpc("mark_line_refunded", {
      line: input.id,
    });
    if (error) {
      throw new ActionFailure(
        error.code === "42501" ? "forbidden" : "notFound"
      );
    }
    return success();
  }
);

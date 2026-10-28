import "server-only";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { AdminClient } from "@repo/database/admin";

/**
 * An order goes out in one parcel per seller: The IDEA's own stock from
 * its pickup location, each shop's lines from the shop's branch. These
 * helpers answer questions about the order as a whole.
 */

interface Line {
  quantity: number;
  seller_id: string | null;
  unit_price: number;
}

export const isHouseLine = (line: Pick<Line, "seller_id">) =>
  !line.seller_id || line.seller_id === HOUSE_SELLER_ID;

/** Unit price × quantity over the lines. */
export const linesValue = (lines: readonly Line[]) =>
  lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0);

const check = <T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}) => {
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

/** Whether the order already has a parcel (live or delivered). */
export const hasParcel = async (admin: AdminClient, orderId: string) => {
  const { count } = await admin
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .is("return_id", null)
    .or("active.eq.true,delivered_at.not.is.null");
  return (count ?? 0) > 0;
};

/**
 * Whether everything still due has a parcel: The IDEA's lines (when there
 * are any) and every shop line that isn't cancelled or out of stock.
 */
export const allSent = async (admin: AdminClient, orderId: string) => {
  const lines =
    check(
      await admin
        .from("order_items")
        .select("seller_id, seller_status, shipment_id")
        .eq("order_id", orderId)
    ) ?? [];
  const shopPending = lines.some(
    (line) =>
      !isHouseLine(line) &&
      (line.seller_status === "waiting" ||
        (line.seller_status === "ready" && !line.shipment_id))
  );
  if (shopPending) {
    return false;
  }
  if (!lines.some(isHouseLine)) {
    return true;
  }
  const { count } = await admin
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("seller_id", HOUSE_SELLER_ID)
    .is("return_id", null)
    .or("active.eq.true,delivered_at.not.is.null");
  return (count ?? 0) > 0;
};

/** Whether every live parcel of the order is delivered and none is due. */
export const allDelivered = async (admin: AdminClient, orderId: string) => {
  const { count } = await admin
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId)
    .eq("active", true)
    .is("return_id", null)
    .is("delivered_at", null);
  return (count ?? 0) === 0 && (await allSent(admin, orderId));
};

/**
 * Marks the order shipped (with the first parcel's tracking) once every
 * parcel has gone; until then only the tracking is filled in.
 */
export const markOrderSent = async (
  admin: AdminClient,
  orderId: string,
  tracking: { code: string | null; url: string | null }
) => {
  check(
    await admin
      .from("orders")
      .update({ tracking_number: tracking.code, tracking_url: tracking.url })
      .eq("id", orderId)
      .is("tracking_number", null)
  );
  if (await allSent(admin, orderId)) {
    check(
      await admin
        .from("orders")
        .update({ status: "shipped" })
        .eq("id", orderId)
        .in("status", ["paid", "confirmed", "processing"])
    );
  }
};

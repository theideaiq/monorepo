import type { OrderStatus, RentalStatus } from "@repo/database";

/**
 * The status changes staff may make, mirroring the database guards
 * (`private.guard_order_status`, `private.on_rental_status`), so the
 * screens only offer moves the database will accept. Online payments and
 * refunds happen through the payment webhook, never by hand; cash orders
 * are paid with "Mark cash collected" (`mark_cash_collected`).
 */
const orderMoves: Partial<Record<OrderStatus, OrderStatus[]>> = {
  confirmed: ["processing", "shipped", "cancelled"],
  paid: ["processing", "shipped"],
  pending: ["cancelled"],
  processing: ["shipped"],
  shipped: ["delivered"],
};

const rentalMoves: Partial<Record<RentalStatus, RentalStatus[]>> = {
  active: ["returned", "overdue"],
  overdue: ["returned", "active"],
  requested: ["active", "cancelled"],
};

/** A cash order whose cash isn't in yet. */
export interface UnpaidCash {
  cash: boolean;
  paid: boolean;
}

/**
 * The next statuses staff can set. An unpaid cash order can still be
 * cancelled while it's prepared or on its way, and is delivered by
 * recording the cash rather than by hand.
 */
export const nextOrderStatuses = (
  status: OrderStatus,
  { cash, paid }: UnpaidCash = { cash: false, paid: true }
): OrderStatus[] => {
  const moves = orderMoves[status] ?? [];
  if (!cash || paid) {
    return moves;
  }
  if (status === "processing") {
    return [...moves, "cancelled"];
  }
  if (status === "shipped") {
    return ["cancelled"];
  }
  return moves;
};

/** Cash orders whose cash can be recorded now. */
export const canCollectCash = (status: OrderStatus, unpaid: UnpaidCash) =>
  unpaid.cash &&
  !unpaid.paid &&
  ["confirmed", "processing", "shipped", "delivered"].includes(status);

export const nextRentalStatuses = (status: RentalStatus): RentalStatus[] =>
  rentalMoves[status] ?? [];

/** Orders paid but not yet delivered: the fulfilment queue. */
export const awaitingFulfilment: OrderStatus[] = [
  "paid",
  "confirmed",
  "processing",
];

export const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "paid",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const rentalStatuses: RentalStatus[] = [
  "requested",
  "active",
  "overdue",
  "returned",
  "cancelled",
];

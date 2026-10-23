import type { OrderStatus, RentalStatus } from "@repo/database";

/**
 * The status changes staff may make, mirroring the database guards
 * (`private.guard_order_status`, `private.on_rental_status`), so the
 * screens only offer moves the database will accept. Payment and refunds
 * happen through the payment webhook, never by hand.
 */
const orderMoves: Partial<Record<OrderStatus, OrderStatus[]>> = {
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

export const nextOrderStatuses = (status: OrderStatus): OrderStatus[] =>
  orderMoves[status] ?? [];

export const nextRentalStatuses = (status: RentalStatus): RentalStatus[] =>
  rentalMoves[status] ?? [];

/** Orders paid but not yet delivered: the fulfilment queue. */
export const awaitingFulfilment: OrderStatus[] = ["paid", "processing"];

export const orderStatuses: OrderStatus[] = [
  "pending",
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

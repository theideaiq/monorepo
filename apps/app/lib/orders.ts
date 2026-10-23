import { orderSteps } from "@repo/commerce";
import type { OrderStatus } from "@repo/database";

/** The steps shown on an order: placed (awaiting payment), then fulfilment. */
export const progressSteps = ["pending", ...orderSteps] as const;

/** Orders still on their way to the customer. */
export const ACTIVE_ORDER_STATUSES = [
  "pending",
  "paid",
  "processing",
  "shipped",
] as const satisfies readonly OrderStatus[];

/**
 * Index of the step the order has reached in `progressSteps`, or -1 when it
 * left the flow (cancelled or refunded).
 */
export const orderProgress = (status: OrderStatus) =>
  (progressSteps as readonly string[]).indexOf(status);

export const isActiveOrder = (status: OrderStatus) =>
  (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);

/** Total quantity of an order's items. */
export const itemCount = (items: readonly { quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

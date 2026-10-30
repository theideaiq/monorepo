import {
  cashOrderSteps,
  type Fulfilment,
  orderSteps,
  type PaymentMethod,
} from "@repo/commerce";
import type { OrderStatus } from "@repo/database";

/** The steps shown on an order: placed (awaiting payment), then fulfilment. */
export const progressSteps = ["pending", ...orderSteps] as const;

/** A cash order's steps: confirmed when placed, then fulfilment. */
export const cashProgressSteps = cashOrderSteps;

/** The steps for an order paid this way. */
export const stepsFor = (
  paymentMethod: PaymentMethod = "online"
): readonly OrderStatus[] =>
  paymentMethod === "cash_on_delivery" ? cashProgressSteps : progressSteps;

/** Orders still on their way to the customer. */
export const ACTIVE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "paid",
  "processing",
  "shipped",
] as const satisfies readonly OrderStatus[];

/**
 * Index of the step the order has reached in its steps (`stepsFor`), or -1
 * when it left the flow (cancelled or refunded).
 */
export const orderProgress = (
  status: OrderStatus,
  paymentMethod: PaymentMethod = "online"
) => stepsFor(paymentMethod).indexOf(status);

export const isActiveOrder = (status: OrderStatus) =>
  (ACTIVE_ORDER_STATUSES as readonly string[]).includes(status);

/** Total quantity of an order's items. */
export const itemCount = (items: readonly { quantity: number }[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

/**
 * The message key for a status: pickup orders are "ready for pickup" when
 * shipped and "picked up" when delivered.
 */
export const statusMessageKey = (
  status: OrderStatus,
  fulfilment: Fulfilment = "delivery"
) =>
  fulfilment === "pickup" && (status === "shipped" || status === "delivered")
    ? (`orderStatusPickup.${status}` as const)
    : (`orderStatus.${status}` as const);

/**
 * The payment method's message key under `store.paymentMethod`: cash is
 * "cash on delivery" or "pay at pickup".
 */
export const paymentMessageKey = (
  paymentMethod: PaymentMethod,
  fulfilment: Fulfilment
) =>
  paymentMethod === "cash_on_delivery" && fulfilment === "pickup"
    ? ("cash_at_pickup" as const)
    : paymentMethod;

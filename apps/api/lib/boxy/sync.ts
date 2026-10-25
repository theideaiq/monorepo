/**
 * Turns a Boxy order (GET /merchants/orders/{uid}) into our shipment's
 * fields, and what it means for the order. Pure, so it is tested without
 * the network.
 */

export interface BoxyStatus {
  created_at?: string;
  pivot?: { carrier_message?: string | null; created_at?: string } | null;
  slug?: string;
  title?: string;
}

export interface BoxyOrder {
  fee?: number | null;
  last_statuses?: BoxyStatus[] | null;
  merchant_action_required?: boolean | number | null;
  merchant_action_required_merchant_text?: string | null;
  merchant_action_required_text?: string | null;
  platform_code?: string | null;
  status?: BoxyStatus | null;
  statuses?: BoxyStatus[] | null;
  tracking_page?: string | null;
  uid: string;
}

/** Boxy statuses after which nothing more happens to the parcel. */
const DELIVERED = new Set(["delivered", "partially-delivered"]);
const RETURNED = new Set(["returned", "partially-returned"]);

/** Statuses in which Boxy can still cancel the parcel (before pick-up). */
export const CANCELLABLE = new Set(["new", "scheduled"]);

export const isFinished = (status: string) =>
  DELIVERED.has(status) || RETURNED.has(status);

export interface ShipmentUpdate {
  action_required: string | null;
  delivered_at?: string;
  fee?: number;
  history: {
    at: string | null;
    message: string | null;
    status: string;
    title: string;
  }[];
  returned_at?: string;
  status: string;
  status_title: string | null;
  tracking_code?: string;
  tracking_url?: string;
}

const MAX_HISTORY = 50;

/**
 * The shipment's new fields. `delivered_at` / `returned_at` are set the
 * first time the parcel is seen delivered or returned (`now`).
 */
export const shipmentUpdate = (
  order: BoxyOrder,
  current: { delivered_at: string | null; returned_at: string | null },
  now: string
): ShipmentUpdate => {
  const status = order.status?.slug ?? "new";
  const steps = order.last_statuses ?? order.statuses ?? [];
  const action = order.merchant_action_required
    ? (order.merchant_action_required_merchant_text ??
      order.merchant_action_required_text ??
      null)
    : null;
  return {
    action_required: action?.slice(0, 1000) ?? null,
    ...(DELIVERED.has(status) && !current.delivered_at
      ? { delivered_at: now }
      : {}),
    ...(typeof order.fee === "number" ? { fee: order.fee } : {}),
    history: steps.slice(-MAX_HISTORY).map((step) => ({
      at: step.pivot?.created_at ?? step.created_at ?? null,
      message: step.pivot?.carrier_message ?? null,
      status: step.slug ?? "",
      title: step.title ?? step.slug ?? "",
    })),
    ...(RETURNED.has(status) && !current.returned_at
      ? { returned_at: now }
      : {}),
    status,
    status_title: order.status?.title ?? null,
    ...(order.platform_code ? { tracking_code: order.platform_code } : {}),
    ...(order.tracking_page?.startsWith("https://")
      ? { tracking_url: order.tracking_page }
      : {}),
  };
};

/** Whether this update delivers the order (it moves to delivered). */
export const deliversOrder = (update: ShipmentUpdate) =>
  update.delivered_at !== undefined;

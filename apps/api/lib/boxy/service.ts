import "server-only";

import { HOUSE_SELLER_ID, variantName } from "@repo/commerce";
import type { AdminClient } from "@repo/database/admin";
import { env } from "@/env";
import { type BoxyClient, BoxyError, createBoxyClient } from "./client";
import {
  buildBoxyOrder,
  type OrderForBoxy,
  type ParcelSize,
  parcelCash,
  parcelOrder,
} from "./order-request";
import {
  allDelivered,
  hasParcel,
  isHouseLine,
  linesValue,
  markOrderSent,
} from "./parcels";
import { CANCELLABLE, deliversOrder, shipmentUpdate } from "./sync";

/** The Boxy client, or null while the key or secret is unset. */
export const getBoxy = (): BoxyClient | null =>
  env.BOXY_API_KEY && env.BOXY_API_SECRET
    ? createBoxyClient({
        apiKey: env.BOXY_API_KEY,
        apiSecret: env.BOXY_API_SECRET,
        baseUrl: env.BOXY_API_URL,
      })
    : null;

/** Why an order can't be sent (or a shipment changed); a message key. */
export type ShipmentProblem =
  | "already_shipped"
  | "carrier_rejected"
  | "no_area"
  | "not_cancellable"
  | "not_found"
  | "not_shippable";

export class ShipmentError extends Error {
  readonly problem: ShipmentProblem;
  constructor(
    problem: ShipmentProblem,
    { cause, message = problem }: { cause?: unknown; message?: string } = {}
  ) {
    super(message, { cause });
    this.name = "ShipmentError";
    this.problem = problem;
  }
}

/** Orders that can go out: paid online, or cash orders confirmed. */
const SHIPPABLE = new Set(["paid", "confirmed", "processing"]);

const SHIPMENT_COLUMNS =
  "id, order_id, carrier_id, status, active, delivered_at, returned_at" as const;

interface ShipmentRow {
  active: boolean;
  carrier_id: string;
  delivered_at: string | null;
  id: string;
  order_id: string;
  returned_at: string | null;
  status: string;
}

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

/**
 * Sends The IDEA's own lines of a packed order to Boxy: creates the
 * parcel, asks for a pick-up, records the shipment and marks the order
 * shipped with its tracking code and page once every seller's parcel has
 * gone (the customer is notified by the order-status trigger). Shops send
 * their own lines from Partners (`./shop-parcels`).
 */
export const dispatchOrder = async (
  admin: AdminClient,
  boxy: BoxyClient,
  {
    createdBy,
    fragile,
    orderId,
    size,
  }: { createdBy: string; fragile: boolean; orderId: string; size: ParcelSize }
) => {
  const order = check(
    await admin
      .from("orders")
      .select(
        "id, number, status, fulfilment, payment_method, paid_at, total, shipping_fee, shipping_address, delivery_zone_id, order_items (name_en, unit_price, quantity, attributes, seller_id, variant:product_variants (label_ar, label_en))"
      )
      .eq("id", orderId)
      .maybeSingle()
  );
  if (!order) {
    throw new ShipmentError("not_found");
  }
  const ours = order.order_items.filter(isHouseLine);
  if (
    order.fulfilment !== "delivery" ||
    !SHIPPABLE.has(order.status) ||
    ours.length === 0
  ) {
    throw new ShipmentError("not_shippable");
  }
  if (await liveShipment(admin, order.id)) {
    throw new ShipmentError("already_shipped");
  }

  const zone = order.delivery_zone_id
    ? check(
        await admin
          .from("delivery_zones")
          .select("carrier_province")
          .eq("id", order.delivery_zone_id)
          .maybeSingle()
      )
    : null;
  const address = order.shipping_address as OrderForBoxy["shipping_address"];
  if (!(zone?.carrier_province && address.city?.trim())) {
    throw new ShipmentError("no_area");
  }

  const forBoxy: OrderForBoxy = {
    number: order.number,
    paid_at: order.paid_at,
    payment_method: order.payment_method,
    shipping_address: address,
    shipping_fee: order.shipping_fee,
    total: order.total,
  };
  const first = !(await hasParcel(admin, order.id));
  const cash = parcelCash({
    first,
    order: forBoxy,
    orderValue: linesValue(order.order_items),
    parcelValue: linesValue(ours),
  });
  const request = buildBoxyOrder({
    fragile,
    lines: ours.map((item) => {
      const version = variantName(
        { ...item.variant, attributes: item.attributes },
        "en"
      );
      return {
        name: version ? `${item.name_en} (${version})` : item.name_en,
        quantity: item.quantity,
        unitPrice: item.unit_price,
      };
    }),
    order: parcelOrder(forBoxy, { cash, first }),
    pickupLocation: env.BOXY_PICKUP_LOCATION,
    province: zone.carrier_province,
    size,
  });

  let created: Awaited<ReturnType<BoxyClient["createOrder"]>>;
  try {
    created = await boxy.createOrder(request);
  } catch (error) {
    if (error instanceof BoxyError && error.status < 500) {
      throw new ShipmentError("carrier_rejected", {
        cause: error,
        message: error.message,
      });
    }
    throw error;
  }
  const parcel = created.order;

  const shipment = check(
    await admin
      .from("shipments")
      .insert({
        carrier_id: parcel.uid,
        cash_amount: cash,
        created_by: createdBy,
        fee: typeof parcel.fee === "number" ? parcel.fee : null,
        fragile,
        order_id: order.id,
        size,
        status: "new",
        tracking_code: parcel.platform_code ?? null,
      })
      .select("id")
      .single()
  );
  if (!shipment) {
    throw new Error("The shipment wasn't saved");
  }

  // The pick-up and the tracking page are extras: the parcel exists even
  // if they fail (staff can retry from the order, the sync fills them).
  const [pickup, shown] = await Promise.allSettled([
    boxy.requestPickUp([parcel.uid]),
    boxy.getOrder(parcel.uid),
  ]);
  const trackingUrl =
    shown.status === "fulfilled" &&
    shown.value.tracking_page?.startsWith("https://")
      ? shown.value.tracking_page
      : null;
  check(
    await admin
      .from("shipments")
      .update({
        pickup_id: pickup.status === "fulfilled" ? pickup.value : null,
        synced_at: new Date().toISOString(),
        tracking_url: trackingUrl,
      })
      .eq("id", shipment.id)
  );
  await markOrderSent(admin, order.id, {
    code: parcel.platform_code ?? null,
    url: trackingUrl,
  });

  return {
    pickupRequested: pickup.status === "fulfilled",
    shipmentId: shipment.id,
    trackingCode: parcel.platform_code ?? null,
  };
};

/** The order's live parcel of The IDEA's own lines. */
const liveShipment = async (admin: AdminClient, orderId: string) =>
  check(
    await admin
      .from("shipments")
      .select(SHIPMENT_COLUMNS)
      .eq("order_id", orderId)
      .eq("seller_id", HOUSE_SELLER_ID)
      .eq("active", true)
      .maybeSingle()
  ) as ShipmentRow | null;

/**
 * Cancels the order's parcel with Boxy (before it is collected): the
 * shipment is closed and the order goes back to processing, ready to send
 * again.
 */
export const cancelShipment = async (
  admin: AdminClient,
  boxy: BoxyClient,
  orderId: string
) => {
  const shipment = await liveShipment(admin, orderId);
  if (!shipment) {
    throw new ShipmentError("not_found");
  }
  if (!CANCELLABLE.has(shipment.status)) {
    throw new ShipmentError("not_cancellable");
  }
  try {
    await boxy.cancelOrder(shipment.carrier_id);
  } catch (error) {
    if (error instanceof BoxyError && error.status < 500) {
      throw new ShipmentError("not_cancellable", {
        cause: error,
        message: error.message,
      });
    }
    throw error;
  }
  const now = new Date().toISOString();
  check(
    await admin
      .from("shipments")
      .update({ active: false, cancelled_at: now, status: "cancelled" })
      .eq("id", shipment.id)
  );
  check(
    await admin
      .from("orders")
      .update({
        status: "processing",
        tracking_number: null,
        tracking_url: null,
      })
      .eq("id", orderId)
      .eq("status", "shipped")
  );
};

/**
 * Reads a parcel from Boxy and saves its status and history; a delivered
 * parcel marks its order delivered (a cash order stays unpaid until its
 * cash is recorded as collected).
 */
export const syncShipment = async (
  admin: AdminClient,
  boxy: BoxyClient,
  shipment: ShipmentRow
) => {
  const parcel = await boxy.getOrder(shipment.carrier_id);
  const now = new Date().toISOString();
  const update = shipmentUpdate(parcel, shipment, now);
  check(
    await admin
      .from("shipments")
      .update({ ...update, synced_at: now })
      .eq("id", shipment.id)
  );
  if (update.tracking_url) {
    check(
      await admin
        .from("orders")
        .update({ tracking_url: update.tracking_url })
        .eq("id", shipment.order_id)
        .is("tracking_url", null)
    );
  }
  if (!(CANCELLABLE.has(update.status) || update.status === "cancelled")) {
    // Collected: a shop's lines in the parcel are picked up.
    check(
      await admin
        .from("order_items")
        .update({ seller_status: "picked_up" })
        .eq("shipment_id", shipment.id)
        .eq("seller_status", "ready")
    );
  }
  if (deliversOrder(update) && (await allDelivered(admin, shipment.order_id))) {
    check(
      await admin
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", shipment.order_id)
        .in("status", ["shipped", "processing", "confirmed", "paid"])
    );
  }
  return update.status;
};

/** Syncs the order's live parcel; null without one. */
export const syncOrderShipment = async (
  admin: AdminClient,
  boxy: BoxyClient,
  orderId: string
) => {
  const shipment = await liveShipment(admin, orderId);
  return shipment ? syncShipment(admin, boxy, shipment) : null;
};

/** Syncs a parcel by Boxy's uid, or by our order number (its custom id). */
export const syncByReference = async (
  admin: AdminClient,
  boxy: BoxyClient,
  { carrierId, orderNumber }: { carrierId?: string; orderNumber?: number }
) => {
  let shipment: ShipmentRow | null = null;
  if (carrierId) {
    shipment = check(
      await admin
        .from("shipments")
        .select(SHIPMENT_COLUMNS)
        .eq("carrier_id", carrierId)
        .maybeSingle()
    ) as ShipmentRow | null;
  } else if (orderNumber) {
    const order = check(
      await admin
        .from("orders")
        .select("id")
        .eq("number", orderNumber)
        .maybeSingle()
    );
    shipment = order ? await liveShipment(admin, order.id) : null;
  }
  return shipment ? syncShipment(admin, boxy, shipment) : null;
};

/** Syncs live parcels that aren't finished, least recently synced first. */
export const syncOpenShipments = async (
  admin: AdminClient,
  boxy: BoxyClient,
  limit = 100
) => {
  const open = check(
    await admin
      .from("shipments")
      .select(SHIPMENT_COLUMNS)
      .eq("active", true)
      .is("delivered_at", null)
      .is("returned_at", null)
      .order("synced_at", { ascending: true, nullsFirst: true })
      .limit(limit)
  ) as ShipmentRow[];
  let synced = 0;
  let failed = 0;
  for (const shipment of open) {
    try {
      // biome-ignore lint/performance/noAwaitInLoops: one parcel at a time keeps within Boxy's rate limit
      await syncShipment(admin, boxy, shipment);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { failed, synced };
};

/**
 * Copies Boxy's areas into `delivery_areas` (for the checkout's area
 * picker); areas Boxy no longer lists are switched off.
 */
export const refreshAreas = async (admin: AdminClient, boxy: BoxyClient) => {
  const regions = await boxy.regions();
  const rows = regions
    .filter((region) => region.uid && region.area_name && region.province_code)
    .map((region) => ({
      active: true,
      code: region.area_name_slug ?? null,
      id: region.uid,
      name: region.area_name.trim().slice(0, 200),
      province: region.province_code,
      remote: Boolean(region.remote),
      updated_at: new Date().toISOString(),
    }));
  if (rows.length === 0) {
    return { areas: 0 };
  }
  for (let start = 0; start < rows.length; start += 500) {
    check(
      // biome-ignore lint/performance/noAwaitInLoops: batches in order
      await admin.from("delivery_areas").upsert(rows.slice(start, start + 500))
    );
  }
  const ids = new Set(rows.map((row) => row.id));
  const stored = check(await admin.from("delivery_areas").select("id")) ?? [];
  const gone = stored.map((row) => row.id).filter((id) => !ids.has(id));
  if (gone.length > 0) {
    check(
      await admin
        .from("delivery_areas")
        .update({ active: false })
        .in("id", gone)
    );
  }
  return { areas: rows.length };
};

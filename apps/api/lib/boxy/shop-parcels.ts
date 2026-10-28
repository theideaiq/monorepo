import "server-only";

import { variantName } from "@repo/commerce";
import type { AdminClient } from "@repo/database/admin";
import { type BoxyClient, BoxyError } from "./client";
import {
  boxyPhone,
  buildBoxyOrder,
  type OrderForBoxy,
  type ParcelSize,
  parcelCash,
  parcelOrder,
} from "./order-request";
import { hasParcel, linesValue, markOrderSent } from "./parcels";
import { ShipmentError } from "./service";

/**
 * A shop's side of delivery: its branches are Boxy pickup locations, and
 * the lines it readies in Partners go out as one parcel per order from the
 * branch, so the courier calls the shop's own pickup contact. The label
 * (printed by the shop) is the only place it sees the customer's name,
 * phone and address.
 */

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
 * Saves the branch in Boxy as a pick-up location (type WAREHOUSE) and
 * stores its uid. Boxy's API has no update, so an edited branch gets a new
 * location and later parcels use it.
 */
export const syncSellerLocation = async (
  admin: AdminClient,
  boxy: BoxyClient,
  locationId: string
) => {
  const location = check(
    await admin
      .from("seller_locations")
      .select(
        "id, name, contact_name, contact_phone, address, region_id, lat, lng, boxy_uid, synced_at, updated_at, seller:sellers (name)"
      )
      .eq("id", locationId)
      .maybeSingle()
  );
  if (!location) {
    throw new ShipmentError("not_found");
  }
  if (
    location.boxy_uid &&
    location.synced_at &&
    location.synced_at >= location.updated_at
  ) {
    return location.boxy_uid;
  }
  let uid: string;
  try {
    uid = await boxy.createPickUpLocation({
      address_text: location.address.trim(),
      default: false,
      description:
        `${location.seller?.name ?? "Shop"} · ${location.name}`.slice(0, 200),
      full_name: location.contact_name.trim(),
      lat: String(location.lat),
      lng: String(location.lng),
      phone: boxyPhone(location.contact_phone),
      region_uid: location.region_id,
      title: location.name.trim(),
      type: "WAREHOUSE",
    });
  } catch (error) {
    if (error instanceof BoxyError && error.status < 500) {
      throw new ShipmentError("carrier_rejected", {
        cause: error,
        message: error.message,
      });
    }
    throw error;
  }
  check(
    await admin
      .from("seller_locations")
      .update({ boxy_uid: uid, synced_at: new Date().toISOString() })
      .eq("id", location.id)
  );
  return uid;
};

export interface SentParcel {
  orderId: string;
  shipmentId: string;
  trackingCode: string | null;
}

interface Branch {
  boxy_uid: string;
  id: string;
  seller_id: string;
}

/** One order's parcel of the shop's ready lines at the branch; null if none. */
const sendOrderParcel = async (
  admin: AdminClient,
  boxy: BoxyClient,
  location: Branch,
  {
    createdBy,
    orderId,
    size,
  }: { createdBy: string; orderId: string; size: ParcelSize }
): Promise<SentParcel | null> => {
  const order = check(
    await admin
      .from("orders")
      .select(
        "id, number, status, fulfilment, payment_method, paid_at, total, shipping_fee, shipping_address, delivery_zone_id, order_items (id, name_en, unit_price, quantity, attributes, seller_id, seller_status, location_id, shipment_id, variant:product_variants (label_ar, label_en))"
      )
      .eq("id", orderId)
      .maybeSingle()
  );
  if (order?.fulfilment !== "delivery") {
    return null;
  }
  const lines = order.order_items.filter(
    (line) =>
      line.seller_id === location.seller_id &&
      line.seller_status === "ready" &&
      line.location_id === location.id &&
      !line.shipment_id
  );
  if (lines.length === 0) {
    return null;
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
    parcelValue: linesValue(lines),
  });
  const { count } = await admin
    .from("shipments")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id);
  const request = buildBoxyOrder({
    customId: `${order.number}-${(count ?? 0) + 1}`,
    fragile: false,
    lines: lines.map((line) => {
      const version = variantName(
        { ...line.variant, attributes: line.attributes },
        "en"
      );
      return {
        name: version ? `${line.name_en} (${version})` : line.name_en,
        quantity: line.quantity,
        unitPrice: line.unit_price,
      };
    }),
    order: parcelOrder(forBoxy, { cash, first }),
    pickupLocation: location.boxy_uid,
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
        fragile: false,
        location_id: location.id,
        order_id: order.id,
        seller_id: location.seller_id,
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
  check(
    await admin
      .from("order_items")
      .update({ shipment_id: shipment.id })
      .in(
        "id",
        lines.map((line) => line.id)
      )
  );
  await markOrderSent(admin, order.id, {
    code: parcel.platform_code ?? null,
    url: null,
  });
  return {
    orderId: order.id,
    shipmentId: shipment.id,
    trackingCode: parcel.platform_code ?? null,
  };
};

/**
 * Sends a shop's ready lines at a branch: one Boxy parcel per order (its
 * share of a cash order's total, the delivery fee on the order's first
 * parcel), then one pick-up request for them all. Lines already in a
 * parcel are skipped, so a retry sends only what's left.
 */
export const sendShopParcels = async (
  admin: AdminClient,
  boxy: BoxyClient,
  {
    createdBy,
    locationId,
    orderIds,
    size = "M",
  }: {
    createdBy: string;
    locationId: string;
    orderIds: readonly string[];
    size?: ParcelSize;
  }
): Promise<{ parcels: SentParcel[]; pickupRequested: boolean }> => {
  const location = check(
    await admin
      .from("seller_locations")
      .select("id, seller_id, boxy_uid")
      .eq("id", locationId)
      .maybeSingle()
  );
  if (!location?.boxy_uid) {
    throw new ShipmentError("not_found");
  }

  const branch: Branch = { ...location, boxy_uid: location.boxy_uid };
  const parcels: SentParcel[] = [];
  for (const orderId of new Set(orderIds)) {
    // biome-ignore lint/performance/noAwaitInLoops: one parcel at a time keeps within Boxy's rate limit
    const sent = await sendOrderParcel(admin, boxy, branch, {
      createdBy,
      orderId,
      size,
    });
    if (sent) {
      parcels.push(sent);
    }
  }

  if (parcels.length === 0) {
    return { parcels, pickupRequested: false };
  }
  const shipments =
    check(
      await admin
        .from("shipments")
        .select("id, carrier_id")
        .in(
          "id",
          parcels.map((parcel) => parcel.shipmentId)
        )
    ) ?? [];
  try {
    const pickup = await boxy.requestPickUp(
      shipments.map((shipment) => shipment.carrier_id)
    );
    check(
      await admin
        .from("shipments")
        .update({ pickup_id: pickup, synced_at: new Date().toISOString() })
        .in(
          "id",
          shipments.map((shipment) => shipment.id)
        )
    );
    return { parcels, pickupRequested: true };
  } catch {
    // The parcels exist; the shop can ask again, and the sync fills in the rest.
    return { parcels, pickupRequested: false };
  }
};

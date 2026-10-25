/**
 * Builds the Boxy order for one of our orders (POST
 * /merchants/orders/request). Pure, so it is tested without the network.
 *
 * - The customer already paid The IDEA's delivery fee, so Boxy's fee is
 *   always the merchant's (`BY_MERCHANT`) and never added on top.
 * - Orders paid online: the courier collects nothing (`PREPAID`).
 * - Cash orders: Boxy collects the sum of the product lines, so the lines
 *   must add up to the order total: the items plus a delivery line when
 *   they do, else one line for the whole order (discounts, Bulbs).
 * - Boxy matches the address by province code and area name (the area
 *   the customer picked, stored as the address's city).
 */

export type ParcelSize = "L" | "M" | "S";

export interface BoxyProduct {
  price: number;
  quantity: number;
  title: string;
}

export interface BoxyOrderRequest {
  contact: {
    address_text: string;
    email: null;
    full_name: string;
    phone: string;
    province_code: string;
    region_name: string;
    secondary_phone: null;
  };
  custom_id: string;
  description: string;
  fee_customer_payable: null;
  is_fragile: boolean;
  payment_type: "COLLECT_ON_DELIVERY" | "PREPAID";
  pick_up_type: "PICK_UP";
  products: BoxyProduct[];
  ready_to_pick_up: boolean;
  saved_pick_up_address_uid?: string;
  shipment_fee_type: "BY_MERCHANT";
  size: ParcelSize;
}

export interface OrderForBoxy {
  number: number;
  paid_at: string | null;
  payment_method: "cash_on_delivery" | "online";
  shipping_address: {
    address?: string;
    city?: string;
    full_name?: string;
    notes?: string;
    phone?: string;
  };
  shipping_fee: number;
  total: number;
}

export interface LineForBoxy {
  name: string;
  quantity: number;
  unitPrice: number;
}

const MAX_TITLE = 120;
const MAX_TEXT = 500;
const LEADING_PLUS = /^\+/;

const cut = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

/** What the courier collects: the total of an unpaid cash order, else 0. */
export const cashToCollect = (order: OrderForBoxy) =>
  order.payment_method === "cash_on_delivery" && !order.paid_at
    ? order.total
    : 0;

/** "+9647701234567" → "9647701234567", as Boxy takes phone numbers. */
export const boxyPhone = (e164: string) => e164.replace(LEADING_PLUS, "");

/** The product lines; for a cash order they add up to what is collected. */
export const boxyProducts = (
  order: OrderForBoxy,
  lines: readonly LineForBoxy[]
): BoxyProduct[] => {
  const items = lines.map((line) => ({
    price: line.unitPrice,
    quantity: line.quantity,
    title: cut(line.name, MAX_TITLE),
  }));
  const cash = cashToCollect(order);
  if (cash === 0) {
    return items;
  }
  const itemsTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  if (itemsTotal + order.shipping_fee === cash) {
    return order.shipping_fee > 0
      ? [
          ...items,
          {
            price: order.shipping_fee,
            quantity: 1,
            title: "Delivery / التوصيل",
          },
        ]
      : items;
  }
  return [
    { price: cash, quantity: 1, title: `The IDEA order #${order.number}` },
  ];
};

export const buildBoxyOrder = ({
  fragile,
  lines,
  order,
  pickupLocation,
  province,
  size,
}: {
  fragile: boolean;
  lines: readonly LineForBoxy[];
  order: OrderForBoxy;
  pickupLocation?: string;
  province: string;
  size: ParcelSize;
}): BoxyOrderRequest => {
  const address = order.shipping_address;
  const notes = address.notes?.trim();
  return {
    contact: {
      address_text: cut(address.address?.trim() || "-", MAX_TEXT),
      email: null,
      full_name: cut(address.full_name?.trim() || "-", MAX_TITLE),
      phone: boxyPhone(address.phone ?? ""),
      province_code: province,
      region_name: address.city?.trim() ?? "",
      secondary_phone: null,
    },
    custom_id: String(order.number),
    description: cut(
      notes
        ? `The IDEA order #${order.number} · ${notes}`
        : `The IDEA order #${order.number}`,
      MAX_TEXT
    ),
    fee_customer_payable: null,
    is_fragile: fragile,
    payment_type: cashToCollect(order) > 0 ? "COLLECT_ON_DELIVERY" : "PREPAID",
    pick_up_type: "PICK_UP",
    products: boxyProducts(order, lines),
    ready_to_pick_up: true,
    ...(pickupLocation ? { saved_pick_up_address_uid: pickupLocation } : {}),
    shipment_fee_type: "BY_MERCHANT",
    size,
  };
};

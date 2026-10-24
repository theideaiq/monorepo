import { describeAttributes, formatPrice, governorates } from "@repo/commerce";
import { project } from "@repo/config";
import type { Database } from "@repo/database";
import {
  OrderConfirmationTemplate,
  type OrderEmailLocale,
  orderConfirmationSubject,
} from "@repo/email/templates/order-confirmation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

type Client = SupabaseClient<Database>;

interface ShippingAddress {
  address?: string;
  city?: string;
  full_name?: string;
  governorate?: string;
  notes?: string;
  phone?: string;
}

interface OrderRow {
  currency: string;
  fulfilment: "delivery" | "pickup";
  id: string;
  number: number;
  order_items: {
    attributes: unknown;
    name_ar: string;
    name_en: string;
    quantity: number;
    unit_price: number;
  }[];
  payment_method: "cash_on_delivery" | "online";
  shipping_address: ShippingAddress;
  shipping_fee: number;
  subtotal: number;
  total: number;
  user_id: string | null;
}

export interface OrderEmailDependencies {
  admin: Client;
  logger: { info: (message: string, meta?: Record<string, unknown>) => void };
  /** Internal inbox for new paid orders (STORE_NOTIFICATIONS_EMAIL). */
  notifyTo?: string;
  send: (email: {
    react?: ReactElement;
    subject: string;
    text: string;
    to: string;
  }) => Promise<unknown>;
}

const governorateName = (id: string | undefined, locale: OrderEmailLocale) =>
  governorates.find((governorate) => governorate.id === id)?.[locale] ??
  id ??
  "";

const loadOrder = async (admin: Client, orderId: string) => {
  const { data, error } = await admin
    .from("orders")
    .select(
      "id, number, user_id, fulfilment, payment_method, subtotal, shipping_fee, total, currency, shipping_address, order_items (name_ar, name_en, attributes, unit_price, quantity)"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as OrderRow | null;
};

/** The store's counter, for pickup orders. */
export interface PickupAddress {
  address_ar: string | null;
  address_en: string | null;
}

const loadPickupAddress = async (admin: Client) => {
  const { data } = await admin
    .from("store_settings")
    .select("pickup_address_ar, pickup_address_en")
    .maybeSingle();
  return data
    ? { address_ar: data.pickup_address_ar, address_en: data.pickup_address_en }
    : null;
};

/** The order as the email shows it, in one language. */
export const orderEmailContent = (
  order: OrderRow,
  locale: OrderEmailLocale,
  pickupAddress: PickupAddress | null = null
) => {
  const price = (amount: number) => formatPrice(amount, locale);
  const address = order.shipping_address;
  const pickup = order.fulfilment === "pickup";
  const storeAddress =
    (locale === "en" ? pickupAddress?.address_en : pickupAddress?.address_ar) ??
    "";
  return {
    address: {
      address: pickup ? storeAddress : (address.address ?? ""),
      city: address.city,
      fullName: address.full_name ?? "",
      governorate: governorateName(address.governorate, locale),
      notes: address.notes,
      phone: address.phone ?? "",
    },
    cash: order.payment_method === "cash_on_delivery",
    items: order.order_items.map((item) => ({
      details: describeAttributes(item.attributes) || undefined,
      name: locale === "en" ? item.name_en : item.name_ar,
      quantity: item.quantity,
      total: price(item.unit_price * item.quantity),
    })),
    locale,
    orderNumber: `#${order.number}`,
    pickup,
    shipping: price(order.shipping_fee),
    subtotal: price(order.subtotal),
    supportEmail: project.supportEmail ?? "hi@theideaiq.com",
    total: price(order.total),
  };
};

const plainText = (content: ReturnType<typeof orderEmailContent>) =>
  [
    orderConfirmationSubject(content.locale, content.orderNumber),
    "",
    ...content.items.map(
      (item) =>
        `${item.quantity} × ${item.name}${item.details ? ` (${item.details})` : ""}: ${item.total}`
    ),
    "",
    `${content.subtotal} + ${content.shipping} = ${content.total}`,
    "",
    content.address.fullName,
    content.address.phone,
    [content.address.governorate, content.address.city]
      .filter(Boolean)
      .join(", "),
    content.address.address,
    content.address.notes ?? "",
    "",
    content.supportEmail,
  ]
    .join("\n")
    .trim();

/**
 * After a store order is paid, or a cash order is placed: a receipt to the customer (in their profile
 * language) and a note to the store inbox. Customers without an email
 * address (phone-only accounts) are skipped and logged.
 */
export const sendOrderEmails = async (
  orderId: string,
  { admin, logger, notifyTo, send }: OrderEmailDependencies
) => {
  const order = await loadOrder(admin, orderId);
  if (!order) {
    logger.info("Order email skipped (order not found)", { orderId });
    return;
  }

  const [{ data: userData }, { data: profile }] = order.user_id
    ? await Promise.all([
        admin.auth.admin.getUserById(order.user_id),
        admin
          .from("profiles")
          .select("locale")
          .eq("id", order.user_id)
          .maybeSingle(),
      ])
    : [{ data: { user: null } }, { data: null }];
  const email = userData.user?.email;
  const locale: OrderEmailLocale = profile?.locale === "en" ? "en" : "ar";
  const pickupAddress =
    order.fulfilment === "pickup" ? await loadPickupAddress(admin) : null;

  const sends: Promise<unknown>[] = [];

  if (email) {
    const content = orderEmailContent(order, locale, pickupAddress);
    sends.push(
      send({
        react: OrderConfirmationTemplate(content),
        subject: orderConfirmationSubject(locale, content.orderNumber),
        text: plainText(content),
        to: email,
      })
    );
  } else {
    logger.info("Order confirmation not emailed (no email address)", {
      orderId,
      userId: order.user_id,
    });
  }

  if (notifyTo) {
    const content = orderEmailContent(order, "en", pickupAddress);
    const kind = content.cash ? "cash" : "paid";
    const pickupNote = content.pickup ? ", pickup" : "";
    sends.push(
      send({
        subject: `New ${kind} order ${content.orderNumber} (${content.total}${pickupNote})`,
        text: `${plainText(content)}\n\nOrder id: ${order.id}\nCustomer: ${email ?? userData.user?.phone ?? order.user_id ?? "unknown"}`,
        to: notifyTo,
      })
    );
  }

  await Promise.all(sends);
};

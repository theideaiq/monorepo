"use client";

import { getAttribution, track } from "@repo/analytics/client";
import { useAuth } from "@repo/auth/provider";
import { type Fulfilment, localized, type PaymentMethod } from "@repo/commerce";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { callApi } from "./api";
import { rememberCheckout } from "./checkout-tracking";
import { checkoutReturnUrl, openCheckout } from "./hosted-checkout";
import { queryKeys, unwrap } from "./queries";

/** The parts of an order the checkout needs. */
export interface PayableOrder {
  currency: string;
  id: string;
  order_items: {
    id: string;
    name_ar: string;
    name_en: string;
    product_id: string | null;
    quantity: number;
    unit_price: number;
  }[];
  total: number;
}

/** Where the payment page returns to: the order itself. */
export const orderPath = (orderId: string) =>
  `/pass/orders/${encodeURIComponent(orderId)}`;

const analyticsItems = (order: PayableOrder, locale: string) =>
  order.order_items.map((item) => ({
    id: item.product_id ?? item.id,
    name: localized(item, "name", locale),
    price: item.unit_price,
    quantity: item.quantity,
  }));

/**
 * Opens the hosted checkout for a pending order (POST /orders/checkout),
 * remembering it so the purchase is reported once the order is paid.
 */
export const usePayOrder = () => {
  const { supabase } = useAuth();
  const locale = useLocale();

  return useMutation({
    mutationFn: async (order: PayableOrder) => {
      const { referenceId, url } = await callApi<{
        referenceId: string;
        url: string | null;
      }>(supabase, "/orders/checkout", {
        attribution: getAttribution(),
        orderId: order.id,
        redirectUrl: checkoutReturnUrl(locale, orderPath(order.id)),
      });
      if (url) {
        rememberCheckout({
          currency: order.currency,
          items: analyticsItems(order, locale),
          referenceId,
          value: order.total,
        });
        await openCheckout(url);
      }
      return { referenceId, url };
    },
  });
};

/** What the checkout sends to `create_order()`; the fee is priced there. */
export interface PlaceOrder {
  /** The chosen delivery zone; null for pickup. */
  deliveryZone: string | null;
  fulfilment: Fulfilment;
  paymentMethod: PaymentMethod;
  shipping: object;
  /** Bulbs to spend; the server caps them at what the order costs. */
  useBulbs: number;
}

/**
 * Asks apps/api to email the confirmation of a cash order or one paid in
 * full with Bulbs (online payments are confirmed by the payment webhook). Best effort: the order is placed
 * either way, and the API sends it once.
 */
const requestConfirmation = async (
  supabase: Parameters<typeof callApi>[0],
  orderId: string
) => {
  try {
    await callApi(supabase, "/orders/confirmation", { orderId });
  } catch {
    // The order page and the in-app notification still confirm it.
  }
};

/**
 * Checkout from the cart: `create_order()` prices the cart and the delivery
 * fee into an order (and empties the cart). Online orders are pending and
 * the payment page opens; cash orders are confirmed at once. Resolves with
 * the order; `paymentError` is set when the order exists but the payment
 * page couldn't be opened (the customer can pay from the order).
 */
export const usePlaceOrder = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const pay = usePayOrder();
  const locale = useLocale();

  return useMutation({
    mutationFn: async ({
      deliveryZone,
      fulfilment,
      paymentMethod,
      shipping,
      useBulbs,
    }: PlaceOrder) => {
      const created = unwrap(
        await supabase.rpc("create_order", {
          fulfilment,
          payment_method: paymentMethod,
          shipping: { ...shipping },
          use_bulbs: useBulbs,
          ...(deliveryZone ? { delivery_zone: deliveryZone } : {}),
        })
      );
      if (!created) {
        throw new Error("create_order returned no order");
      }
      const order = unwrap(
        await supabase
          .from("orders")
          .select(
            "id, currency, total, order_items (id, product_id, name_ar, name_en, unit_price, quantity)"
          )
          .eq("id", created.id)
          .single()
      ) as PayableOrder;

      track("begin_checkout", {
        currency: order.currency,
        items: analyticsItems(order, locale),
        value: order.total,
      });

      // A teen's order goes to their guardian first; it's paid from the
      // order page once approved.
      if (created.guardian_status === "pending") {
        return { awaitingGuardian: true, order, paymentError: null, url: null };
      }

      // Cash, or paid in full with Bulbs: nothing to pay online now.
      if (paymentMethod === "cash_on_delivery" || order.total === 0) {
        await requestConfirmation(supabase, order.id);
        return { order, paymentError: null, url: null };
      }

      try {
        const { url } = await pay.mutateAsync(order);
        return { order, paymentError: null, url };
      } catch (paymentError) {
        return { order, paymentError, url: null };
      }
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.cart(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]),
  });
};

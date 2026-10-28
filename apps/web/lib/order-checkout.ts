"use client";

import { getAttribution, track } from "@repo/analytics/client";
import { useAuth } from "@repo/auth/provider";
import { localized, type PaymentMethod } from "@repo/commerce";
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
  /** The chosen delivery zone; null when the server finds it. */
  deliveryZone: string | null;
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

/** What the RPCs that create an order return (create_order and friends). */
interface CreatedOrder {
  guardian_status: string | null;
  id: string;
}

/** What placing an order resolved with. */
export interface PlacedOrder {
  awaitingGuardian?: boolean;
  order: PayableOrder;
  paymentError: unknown;
  url: string | null;
}

/**
 * After an RPC created an order: report the checkout, then wait for the
 * guardian, confirm a cash (or free) order, or open the payment page.
 */
const useFinishOrder = () => {
  const { supabase } = useAuth();
  const pay = usePayOrder();
  const locale = useLocale();

  return async (
    created: CreatedOrder | null,
    paymentMethod: PaymentMethod
  ): Promise<PlacedOrder> => {
    if (!created) {
      throw new Error("The order wasn't created");
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
  };
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
  const finish = useFinishOrder();

  return useMutation({
    mutationFn: async ({
      deliveryZone,
      paymentMethod,
      shipping,
      useBulbs,
    }: PlaceOrder) =>
      finish(
        unwrap(
          await supabase.rpc("create_order", {
            payment_method: paymentMethod,
            shipping: { ...shipping },
            use_bulbs: useBulbs,
            ...(deliveryZone ? { delivery_zone: deliveryZone } : {}),
          })
        ),
        paymentMethod
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.cart(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
      ]),
  });
};

/** What the rent checkout sends to `create_rental_order()`. */
export interface PlaceRental extends Omit<PlaceOrder, "useBulbs"> {
  productId: string;
  variantId: string | null;
}

/**
 * Renting one item on its own: `create_rental_order()` makes an order of
 * the rent and its refundable deposit and holds a copy; it's paid like any
 * other order.
 */
export const usePlaceRental = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const finish = useFinishOrder();

  return useMutation({
    mutationFn: async ({
      deliveryZone,
      paymentMethod,
      productId,
      shipping,
      variantId,
    }: PlaceRental) =>
      finish(
        unwrap(
          await supabase.rpc("create_rental_order", {
            payment_method: paymentMethod,
            rental_product: productId,
            shipping: { ...shipping },
            ...(deliveryZone ? { delivery_zone: deliveryZone } : {}),
            ...(variantId ? { rental_variant: variantId } : {}),
          })
        ),
        paymentMethod
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["rentals"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ]),
  });
};

/**
 * Keep it: buy the copy of a Plus rental at its used price less the plan's
 * monthly price (`keep_rental()`), picked up or kept where it is.
 */
export const useKeepRental = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const finish = useFinishOrder();

  return useMutation({
    mutationFn: async ({
      paymentMethod,
      rentalId,
    }: {
      paymentMethod: PaymentMethod;
      rentalId: string;
    }) =>
      finish(
        unwrap(
          await supabase.rpc("keep_rental", {
            payment_method: paymentMethod,
            target: rentalId,
          })
        ),
        paymentMethod
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["rentals"] }),
      ]),
  });
};

/** What the kit booking sends to `book_kit()`. */
export interface PlaceKit {
  deliveryZone: string;
  extraDays: number;
  games: string[];
  kit: string;
  paymentMethod: PaymentMethod;
  shipping: object;
  startsOn: string;
}

/**
 * Booking a game night kit for a weekend: `book_kit()` makes an order of
 * the kit and its refundable deposit, paid like any other order.
 */
export const usePlaceKit = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const finish = useFinishOrder();

  return useMutation({
    mutationFn: async ({
      deliveryZone,
      extraDays,
      games,
      kit,
      paymentMethod,
      shipping,
      startsOn,
    }: PlaceKit) =>
      finish(
        unwrap(
          await supabase.rpc("book_kit", {
            delivery_zone: deliveryZone,
            extra_days: extraDays,
            games,
            kit,
            payment_method: paymentMethod,
            shipping: { ...shipping },
            starts_on: startsOn,
          })
        ),
        paymentMethod
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["orders"] }),
        queryClient.invalidateQueries({ queryKey: ["kits"] }),
      ]),
  });
};

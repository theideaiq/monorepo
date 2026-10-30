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

/** An order's page in the Pass. */
export const orderPath = (orderId: string) =>
  `/pass/orders/${encodeURIComponent(orderId)}`;

/** Checkout's last step, where the payment page returns to: Done. */
export const donePath = (orderId: string) =>
  `/checkout/done/${encodeURIComponent(orderId)}`;

const bulbsKey = (orderId: string) => `checkout-bulbs:${orderId}`;

/** Remembers what an order will earn (from the quote), for Done. */
export const rememberBulbsToEarn = (orderId: string, bulbs: number) => {
  try {
    sessionStorage.setItem(bulbsKey(orderId), String(bulbs));
  } catch {
    // Done then works it out from the member's rate.
  }
};

/** What an order will earn, as the checkout's quote said; null if unknown. */
export const rememberedBulbsToEarn = (orderId: string) => {
  try {
    const value = sessionStorage.getItem(bulbsKey(orderId));
    return value === null ? null : Number(value) || 0;
  } catch {
    return null;
  }
};

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
    mutationFn: async (
      order: PayableOrder & {
        /** Where the payment page returns to; the order's page by default. */
        returnPath?: string;
      }
    ) => {
      const { referenceId, url } = await callApi<{
        referenceId: string;
        url: string | null;
      }>(supabase, "/orders/checkout", {
        attribution: getAttribution(),
        orderId: order.id,
        redirectUrl: checkoutReturnUrl(
          locale,
          order.returnPath ?? orderPath(order.id)
        ),
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
      const { url } = await pay.mutateAsync({
        ...order,
        returnPath: donePath(order.id),
      });
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

/** What the checkout sends to `create_gift_order()`. */
export interface PlaceGift {
  /**
   * Where the gift goes; the recipient gives the address there. Null when
   * nothing is delivered (only Plus months).
   */
  deliveryZone: string | null;
  hidePrice: boolean;
  message: string;
  useBulbs: number;
}

/**
 * The cart as a gift: `create_gift_order()` makes an order without an
 * address, paid online (or with Bulbs), which ships once the recipient
 * claims it from the link.
 */
export const usePlaceGift = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const finish = useFinishOrder();

  return useMutation({
    mutationFn: async ({
      deliveryZone,
      hidePrice,
      message,
      useBulbs,
    }: PlaceGift) =>
      finish(
        unwrap(
          await supabase.rpc("create_gift_order", {
            // The argument has no default, so null is sent for "no area".
            delivery_zone: deliveryZone as string,
            hide_price: hidePrice,
            use_bulbs: useBulbs,
            ...(message.trim() ? { message: message.trim() } : {}),
          })
        ),
        "online"
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

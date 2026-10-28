"use client";

import { track } from "@repo/analytics/client";
import { useAuth } from "@repo/auth/provider";
import {
  type Fulfilment,
  HOUSE_SELLER_ID,
  type PaymentMethod,
  toCheckoutQuote,
} from "@repo/commerce";
import {
  getProductBySlug,
  getProductOffers,
  getStoreSettings,
  listCategories,
  listDeliveryAreas,
  listDeliveryZones,
  listProducts,
  type ProductFilters,
} from "@repo/commerce/catalog";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { type CartItem, cartCount, isOtherOffer, MAX_QUANTITY } from "./cart";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** Store catalog, cart and orders, all through RLS. */

export const useCategories = (kind: "rental" | "sale" = "sale") => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => listCategories(supabase, kind),
    queryKey: queryKeys.categories(kind),
    staleTime: 5 * 60_000,
  });
};

export const useProducts = (filters: ProductFilters) => {
  const { supabase } = useAuth();
  return useQuery({
    // Keeps the grid on screen while the next page or filter loads.
    placeholderData: keepPreviousData,
    queryFn: () => listProducts(supabase, filters),
    queryKey: queryKeys.products(filters),
  });
};

export const useProduct = (slug: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(slug),
    queryFn: () => getProductBySlug(supabase, slug),
    queryKey: queryKeys.product(slug),
  });
};

export const useStoreSettings = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => getStoreSettings(supabase),
    queryKey: queryKeys.storeSettings,
    staleTime: 5 * 60_000,
  });
};

/** The courier's areas in a province, for the checkout's area picker. */
export const useDeliveryAreas = (province: string | null | undefined) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(province),
    queryFn: () => listDeliveryAreas(supabase, province ?? ""),
    queryKey: ["delivery-areas", province ?? ""],
    staleTime: 60 * 60_000,
  });
};

/** The delivery zones offered at checkout, with their fees. */
export const useDeliveryZones = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => listDeliveryZones(supabase),
    queryKey: queryKeys.deliveryZones,
    staleTime: 5 * 60_000,
  });
};

/** What the checkout asks the server to price. */
export interface QuoteRequest {
  fulfilment: Fulfilment;
  /** A governorate id when there's no zone to choose. */
  governorate?: string | null;
  paymentMethod: PaymentMethod;
  useBulbs: number;
  zoneId?: string | null;
}

/**
 * The checkout priced by the server (`checkout_quote()`): delivery, the
 * discount under the giveaway cap, the Bulbs spent and earned. `version`
 * re-asks when the cart or a discount changes; null waits for a zone.
 */
export const useCheckoutQuote = (
  request: QuoteRequest | null,
  version: readonly unknown[]
) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user) && request !== null,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const ask = request as QuoteRequest;
      return toCheckoutQuote(
        unwrap(
          await supabase.rpc("checkout_quote", {
            delivery_zone: ask.zoneId || undefined,
            fulfilment: ask.fulfilment,
            governorate: ask.governorate || undefined,
            payment_method: ask.paymentMethod,
            use_bulbs: ask.useBulbs,
          })
        )
      );
    },
    queryKey: ["checkout-quote", user?.id ?? "", request, ...version],
    retry: false,
  });
};

const CART_COLUMNS =
  "id, quantity, condition, product_id, variant_id, seller_id, seller:sellers (name), product:products (id, slug, kind, status, condition, name_ar, name_en, price, compare_at_price, currency, images, stock_count), variant:product_variants (id, label_ar, label_en, attributes, price, compare_at_price, stock_count, images)" as const;

/** Adds the copies on offer to lines in another condition (used, …) or from a shop. */
const withOffers = async (
  supabase: ReturnType<typeof useAuth>["supabase"],
  items: CartItem[]
) => {
  const productIds = [
    ...new Set(items.filter(isOtherOffer).map((item) => item.product_id)),
  ];
  if (productIds.length === 0) {
    return items;
  }
  const offers = new Map(
    await Promise.all(
      productIds.map(
        async (id) => [id, await getProductOffers(supabase, id)] as const
      )
    )
  );
  return items.map((item) => {
    if (!isOtherOffer(item)) {
      return item;
    }
    const offer = offers
      .get(item.product_id)
      ?.find(
        (candidate) =>
          candidate.purpose === "sale" &&
          candidate.condition === (item.condition ?? item.product?.condition) &&
          candidate.variant_id === item.variant_id &&
          candidate.seller_id === item.seller_id
      );
    return {
      ...item,
      offer:
        offer && offer.price !== null
          ? { available: offer.available, price: offer.price }
          : null,
    };
  });
};

export const useCart = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      withOffers(
        supabase,
        unwrap(
          await supabase
            .from("cart_items")
            .select(CART_COLUMNS)
            .eq("user_id", requireUserId(user?.id))
            .order("created_at")
        ) as unknown as CartItem[]
      ),
    queryKey: queryKeys.cart(user?.id ?? ""),
  });
};

/** Items in the cart, for the navigation badge (shares the cart query). */
export const useCartCount = () => {
  const cart = useCart();
  return cart.data ? cartCount(cart.data) : 0;
};

export interface AddToCart {
  analytics: {
    currency: string;
    id: string;
    name: string;
    price: number;
    /** The chosen version's English name, when the product has several. */
    variant?: string;
  };
  /** Another condition than the product's own (a used copy); null otherwise. */
  condition?: CartItem["condition"];
  productId: string;
  quantity: number;
  /** A shop's offer; The IDEA's when missing. */
  sellerId?: string;
  /** The chosen variant (a product's only one when there is no choice). */
  variantId: string;
}

/**
 * Adds to the cart: raises the quantity of an existing line (one line per
 * product, variant, seller and condition) or inserts a new one.
 */
export const useAddToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      condition = null,
      productId,
      quantity,
      sellerId = HOUSE_SELLER_ID,
      variantId,
    }: AddToCart) => {
      const userId = requireUserId(user?.id);
      let existing = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("variant_id", variantId)
        .eq("seller_id", sellerId);
      existing = condition
        ? existing.eq("condition", condition)
        : existing.is("condition", null);
      const line = unwrap(await existing.maybeSingle());

      if (line) {
        unwrap(
          await supabase
            .from("cart_items")
            .update({
              quantity: Math.min(line.quantity + quantity, MAX_QUANTITY),
            })
            .eq("id", line.id)
        );
        return;
      }

      unwrap(
        await supabase.from("cart_items").insert({
          condition,
          product_id: productId,
          quantity: Math.min(quantity, MAX_QUANTITY),
          seller_id: sellerId,
          user_id: userId,
          variant_id: variantId,
        })
      );
    },
    onSuccess: async (_data, { analytics, quantity }) => {
      track("add_to_cart", {
        currency: analytics.currency,
        items: [
          {
            id: analytics.id,
            name: analytics.name,
            price: analytics.price,
            quantity,
            variant: analytics.variant,
          },
        ],
        value: analytics.price * quantity,
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      });
    },
  });
};

export const useUpdateCartLine = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      unwrap(
        await (quantity > 0
          ? supabase.from("cart_items").update({ quantity }).eq("id", id)
          : supabase.from("cart_items").delete().eq("id", id))
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

const ORDER_COLUMNS =
  "id, number, status, guardian_status, fulfilment, payment_method, delivery_zone_id, subtotal, shipping_fee, discount, discount_source, bulbs_used, bulbs_discount, total, currency, shipping_address, tracking_number, tracking_url, paid_at, created_at, order_items (id, product_id, variant_id, seller_id, seller_name, condition, name_ar, name_en, attributes, unit_price, quantity, variant:product_variants (label_ar, label_en))" as const;

export const useOrders = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("orders")
          .select(ORDER_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(50)
      ),
    queryKey: queryKeys.orders(user?.id ?? ""),
  });
};

export const useOrder = (orderId: string, refetchInterval?: number | false) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && orderId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("orders")
          .select(ORDER_COLUMNS)
          .eq("id", orderId)
          .maybeSingle()
      ),
    queryKey: queryKeys.order(orderId),
    refetchInterval,
  });
};

/** The payments of one order, to report the purchase once it is paid. */
export const useOrderPayments = (
  orderId: string,
  refetchInterval?: number | false
) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && orderId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("payments")
          .select("id, status, reference_id")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
      ),
    queryKey: queryKeys.orderPayments(orderId),
    refetchInterval,
  });
};

/** cancel_order(): customers cancel their own orders before paying. */
export const useCancelOrder = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      unwrap(await supabase.rpc("cancel_order", { order_id: orderId }));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
};

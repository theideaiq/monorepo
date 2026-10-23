"use client";

import { track } from "@repo/analytics/client";
import { useAuth } from "@repo/auth/provider";
import {
  getProductBySlug,
  getStoreSettings,
  listCategories,
  listProducts,
  type ProductFilters,
} from "@repo/commerce/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type CartItem, cartCount, MAX_QUANTITY } from "./cart";
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

const CART_COLUMNS =
  "id, quantity, product_id, variant_id, product:products (id, slug, kind, status, name_ar, name_en, price, compare_at_price, currency, images, stock_count), variant:product_variants (id, attributes, price_override, stock_count, image)" as const;

export const useCart = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("cart_items")
          .select(CART_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("created_at")
      ) as unknown as CartItem[],
    queryKey: queryKeys.cart(user?.id ?? ""),
  });
};

/** Items in the cart, for the navigation badge (shares the cart query). */
export const useCartCount = () => {
  const cart = useCart();
  return cart.data ? cartCount(cart.data) : 0;
};

export interface AddToCart {
  analytics: { currency: string; id: string; name: string; price: number };
  productId: string;
  quantity: number;
  variantId: string | null;
}

/**
 * Adds to the cart: raises the quantity of an existing line (one line per
 * product and variant) or inserts a new one.
 */
export const useAddToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, quantity, variantId }: AddToCart) => {
      const userId = requireUserId(user?.id);
      let existing = supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", userId)
        .eq("product_id", productId);
      existing = variantId
        ? existing.eq("variant_id", variantId)
        : existing.is("variant_id", null);
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
          product_id: productId,
          quantity: Math.min(quantity, MAX_QUANTITY),
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
  "id, number, status, subtotal, shipping_fee, total, currency, shipping_address, tracking_number, paid_at, created_at, order_items (id, product_id, variant_id, name_ar, name_en, attributes, unit_price, quantity)" as const;

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

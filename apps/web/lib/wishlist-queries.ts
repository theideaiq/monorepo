"use client";

import { useAuth } from "@repo/auth/provider";
import { liveVariants } from "@repo/commerce";
import { PRODUCT_CARD_COLUMNS, type ProductCard } from "@repo/commerce/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";
import { useAddToCart } from "./store-queries";

/** The signed-in user's wishlist (RLS: own rows only). */

export interface WishlistItem {
  created_at: string;
  /** The list it is in, if any. */
  list_id: string | null;
  /** "Tell me": watched changes go to the bell. */
  notify: boolean;
  position: number;
  /** Tell me only below this price. */
  price_target: number | null;
  product:
    | (ProductCard & {
        release_date: string | null;
        status: string;
      })
    | null;
  product_id: string;
  /** The price when saved, for "Price dropped". */
  saved_price: number | null;
}

const WISHLIST_COLUMNS = `product_id, created_at, position, list_id, notify, price_target, saved_price, product:products (${PRODUCT_CARD_COLUMNS}, status, release_date)`;

export const useWishlist = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("wishlist_items")
          .select(WISHLIST_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("position")
      ) as unknown as WishlistItem[],
    queryKey: queryKeys.wishlist(user?.id ?? ""),
  });
};

/** Whether a product is on the wishlist (shares the wishlist query). */
export const useIsWishlisted = (productId: string) => {
  const wishlist = useWishlist();
  return wishlist.data?.some((item) => item.product_id === productId) ?? false;
};

/** Adds a product to the wishlist, or removes it when `saved` is true. */
export const useToggleWishlist = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.wishlist(user?.id ?? "");

  return useMutation({
    mutationFn: async ({
      productId,
      saved,
    }: {
      productId: string;
      saved: boolean;
    }) => {
      const userId = requireUserId(user?.id);
      unwrap(
        await (saved
          ? supabase
              .from("wishlist_items")
              .delete()
              .eq("user_id", userId)
              .eq("product_id", productId)
          : supabase
              .from("wishlist_items")
              .insert({ product_id: productId, user_id: userId }))
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
};

/** Changes a saved item: "Tell me", its price target or its list. */
export const useUpdateSaved = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      changes,
      productId,
    }: {
      changes: Partial<
        Pick<WishlistItem, "list_id" | "notify" | "price_target">
      >;
      productId: string;
    }) =>
      unwrap(
        await supabase
          .from("wishlist_items")
          .update(changes)
          .eq("user_id", requireUserId(user?.id))
          .eq("product_id", productId)
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist(user?.id ?? ""),
      }),
  });
};

/**
 * Moves a wishlist item to the cart (one copy of its only live variant) and
 * removes it.
 */
export const useMoveToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const addToCart = useAddToCart();

  return useMutation({
    mutationFn: async ({
      name,
      product,
    }: {
      name: string;
      product: NonNullable<WishlistItem["product"]>;
    }) => {
      const [variant, ...others] = liveVariants(product.variants);
      if (!variant || others.length > 0) {
        throw new Error("Choose a variant");
      }
      await addToCart.mutateAsync({
        analytics: {
          currency: product.currency,
          id: product.id,
          name,
          price: product.price,
        },
        productId: product.id,
        quantity: 1,
        variantId: variant.id,
      });
      unwrap(
        await supabase
          .from("wishlist_items")
          .delete()
          .eq("user_id", requireUserId(user?.id))
          .eq("product_id", product.id)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.wishlist(user?.id ?? ""),
      }),
  });
};

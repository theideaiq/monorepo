"use client";

import { useAuth } from "@repo/auth/provider";
import type { ProductCard } from "@repo/commerce/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";
import { useAddToCart } from "./store-queries";

/** The signed-in user's wishlist (RLS: own rows only). */

export interface WishlistItem {
  created_at: string;
  product:
    | (ProductCard & {
        /** Its variants: with several to choose from, one is picked on its page. */
        product_variants: { active: boolean; id: string }[];
        status: string;
      })
    | null;
  product_id: string;
}

const WISHLIST_COLUMNS =
  "product_id, created_at, product:products (id, slug, kind, status, name_ar, name_en, price, compare_at_price, currency, condition, stock_count, images, featured, category_id, product_variants (id, active))" as const;

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
          .order("created_at", { ascending: false })
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
      const [variant, ...others] = product.product_variants.filter(
        (candidate) => candidate.active
      );
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

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
  /** The member's order; for Plus members the first rentable item is next. */
  position: number;
  product:
    | (ProductCard & {
        status: string;
      })
    | null;
  product_id: string;
}

const WISHLIST_COLUMNS = `product_id, created_at, position, product:products (${PRODUCT_CARD_COLUMNS}, status)`;

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

/** Puts Saved in a new order (the first is next in the Plus queue). */
export const useReorderSaved = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKeys.wishlist(user?.id ?? "");

  return useMutation<
    unknown,
    Error,
    string[],
    { previous: WishlistItem[] | undefined }
  >({
    mutationFn: async (productIds: string[]) =>
      unwrap(await supabase.rpc("reorder_saved", { products: productIds })),
    onError: (_error, _ids, context) =>
      queryClient.setQueryData(key, context?.previous),
    onMutate: async (productIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WishlistItem[]>(key);
      if (previous) {
        const order = new Map(productIds.map((id, index) => [id, index]));
        queryClient.setQueryData(
          key,
          [...previous].sort(
            (a, b) =>
              (order.get(a.product_id) ?? 0) - (order.get(b.product_id) ?? 0)
          )
        );
      }
      return { previous };
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

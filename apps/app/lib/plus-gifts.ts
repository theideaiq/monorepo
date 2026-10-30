"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Plus months as a gift (migration `20270221000000_plus_gifts.sql`): 1 to
 * 12 prepaid months of a monthly plan, in the cart and sent with Send as a
 * gift. Starting Plus for yourself is the plan page's own checkout.
 */

/** How many months can be given at once. */
export const GIFT_MONTHS = [1, 3, 6, 12] as const;

/** The Plus months waiting in the member's cart (`cart_plus_gifts`). */
export interface CartPlusGift {
  months: number;
  plan: { amount: number; name: string; name_ar: string | null } | null;
  plan_id: string;
}

const cartPlusGiftKey = (userId: string) => [...queryKeys.cart(userId), "plus"];

export const useCartPlusGift = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("cart_plus_gifts")
          .select("plan_id, months, plan:plans (name, name_ar, amount)")
          .maybeSingle()
      ) as CartPlusGift | null) ?? null,
    queryKey: cartPlusGiftKey(user?.id ?? ""),
  });
};

/** Puts Plus months in the cart, replacing any there (a cart holds one). */
export const useAddPlusGiftToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ months, plan }: { months: number; plan: string }) => {
      const userId = requireUserId(user?.id);
      unwrap(
        await supabase.from("cart_plus_gifts").delete().eq("user_id", userId)
      );
      unwrap(
        await supabase.from("cart_plus_gifts").insert({ months, plan_id: plan })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export const useRemoveCartPlusGift = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const userId = requireUserId(user?.id);
      unwrap(
        await supabase.from("cart_plus_gifts").delete().eq("user_id", userId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

/** The cart's Plus months, priced: the plan's monthly price each month. */
export const useCartPlusGiftLine = () => {
  const gift = useCartPlusGift().data ?? null;
  return gift?.plan
    ? { item: gift, price: gift.plan.amount * gift.months }
    : null;
};

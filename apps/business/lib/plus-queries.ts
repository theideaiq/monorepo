"use client";

import { getAttribution, track } from "@repo/analytics/client";
import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { callApi } from "./api";
import { rememberCheckout } from "./checkout-tracking";
import { checkoutReturnUrl, openCheckout } from "./hosted-checkout";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** The IDEA Plus: rental allowance, rentals and requests. */

export interface RentalAllowance {
  free: number;
  /** Slots of the live Plus plan (0 without a membership). */
  slots: number;
  /** Tier of the live Plus plan (0 without a membership). */
  tier: number;
  /** Rentals requested, with the member or overdue. */
  used: number;
}

/** my_rental_allowance() as numbers the UI can use directly. */
export const toAllowance = (
  rows:
    | readonly { in_use: number; slots: number; tier?: number | null }[]
    | null
    | undefined
): RentalAllowance => {
  const slots = rows?.[0]?.slots ?? 0;
  const used = rows?.[0]?.in_use ?? 0;
  const tier = rows?.[0]?.tier ?? 0;
  return { free: Math.max(slots - used, 0), slots, tier, used };
};

/** Whether a member on plan tier `memberTier` may rent an item. */
export const meetsTier = (
  required: number | null | undefined,
  memberTier: number
) => required === null || required === undefined || memberTier >= required;

/**
 * The plan that unlocks an item needing `required`: the plan of that tier,
 * else the lowest plan above it.
 */
export const planForTier = <T extends { tier: number | null }>(
  plans: readonly T[] | undefined,
  required: number
): T | undefined =>
  (plans ?? [])
    .filter((plan) => plan.tier !== null && plan.tier >= required)
    .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))[0];

/** The plan tier each rental item needs (absent: any membership). */
export const useRentalTiers = (productIds: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: productIds.length > 0,
    queryFn: async () => {
      const rows = unwrap(
        await supabase
          .from("products")
          .select("id, rental_tier")
          .in("id", [...productIds])
      );
      const tiers = new Map<string, number>();
      for (const row of rows ?? []) {
        if (row.rental_tier !== null) {
          tiers.set(row.id, row.rental_tier);
        }
      }
      return tiers;
    },
    queryKey: queryKeys.rentalTiers(productIds),
    staleTime: 5 * 60_000,
  });
};

export const useRentalAllowance = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      toAllowance(unwrap(await supabase.rpc("my_rental_allowance"))),
    queryKey: queryKeys.rentalAllowance(user?.id ?? ""),
  });
};

export const useRentals = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("rentals")
          .select(
            "id, product_id, name_ar, name_en, status, requested_at, started_at, due_at, returned_at"
          )
          .eq("user_id", requireUserId(user?.id))
          .order("requested_at", { ascending: false })
          .limit(50)
      ),
    queryKey: queryKeys.rentals(user?.id ?? ""),
  });
};

const useRefreshRentals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals(userId) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.rentalAllowance(userId),
      }),
      // Stock counts change with every request and cancellation.
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
};

export const useRequestRental = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshRentals();
  return useMutation({
    mutationFn: async (productId: string) =>
      unwrap(
        await supabase.rpc("request_rental", { rental_product: productId })
      ),
    onSettled: refresh,
  });
};

export const useCancelRental = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshRentals();
  return useMutation({
    mutationFn: async (rentalId: string) =>
      unwrap(await supabase.rpc("cancel_rental", { rental: rentalId })),
    onSettled: refresh,
  });
};

export interface CheckoutPlan {
  amount: number;
  currency: string;
  id: string;
  name: string;
}

/**
 * Starts a hosted checkout for a plan: The IDEA Plus (owned by the user) without
 * `organizationId`, a plan of The IDEA Suite with it. Remembers the checkout so
 * the purchase is reported once paid, then opens the payment page.
 */
export const usePlanCheckout = (
  returnPath: string,
  organizationId?: string
) => {
  const { supabase } = useAuth();
  const locale = useLocale();

  return useMutation({
    mutationFn: async (plan: CheckoutPlan) => {
      const items = [
        { id: plan.id, name: plan.name, price: plan.amount, quantity: 1 },
      ];
      track("begin_checkout", {
        currency: plan.currency,
        items,
        value: plan.amount,
      });
      const { referenceId, url } = await callApi<{
        referenceId: string;
        url: string | null;
      }>(supabase, "/checkout", {
        attribution: getAttribution(),
        ...(organizationId ? { organizationId } : {}),
        planId: plan.id,
        redirectUrl: checkoutReturnUrl(locale, returnPath),
      });
      if (url) {
        rememberCheckout({
          currency: plan.currency,
          items,
          referenceId,
          value: plan.amount,
        });
        await openCheckout(url);
      }
      return { referenceId, url };
    },
  });
};

/** A membership the member can use now (not merely awaiting payment). */
export const isLiveMembership = (status: string | null | undefined) =>
  status === "active" || status === "past_due";

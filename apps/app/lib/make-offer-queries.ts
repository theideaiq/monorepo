"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Make an offer: a listing (a seller's variant in one condition) takes
 * offers when its seller turns them on. Offers start at a share of the
 * price (`min_offer`); the seller accepts, declines or counters within 48
 * hours, and the buyer answers a counter the same way. An accepted offer
 * holds one copy in the cart at that price for 24 hours.
 */

export type OfferStatus = Database["public"]["Enums"]["offer_status"];
type Condition = Database["public"]["Enums"]["product_condition"];

/** Offers still waiting for someone, or in the cart. */
export const LIVE_OFFER_STATUSES = new Set<OfferStatus>([
  "open",
  "countered",
  "accepted",
]);

const offersKey = (userId: string) => ["offers", userId] as const;

/** A product's listings that take offers, with the lowest offer each takes. */
export const useOfferableListings = (productId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(productId),
    queryFn: async () =>
      unwrap(await supabase.rpc("offerable_listings", { item: productId })) ??
      [],
    queryKey: ["offerable-listings", productId],
  });
};

const OFFER_COLUMNS =
  "id, number, status, amount, buyer_amount, seller_counter, buyer_counter, list_price, expires_at, cart_until, condition, created_at, product:products (slug, name_en, name_ar)" as const;

/** The member's offers, newest first. */
export const useMyOffers = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("offers")
          .select(OFFER_COLUMNS)
          .eq("buyer_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(30)
      ) ?? [],
    queryKey: offersKey(user?.id ?? ""),
  });
};

export type MyOffer = NonNullable<
  ReturnType<typeof useMyOffers>["data"]
>[number];

/** Refresh the member's offers and, as an accepted one fills it, the cart. */
const useRefresh = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: offersKey(userId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.cart(userId) }),
    ]);
};

export interface NewOffer {
  amount: number;
  condition: Condition;
  sellerId: string;
  variantId: string;
}

export const useMakeOffer = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (offer: NewOffer) =>
      unwrap(
        await supabase.rpc("make_offer", {
          offered: offer.amount,
          seller: offer.sellerId,
          variant: offer.variantId,
          wanted: offer.condition,
        })
      ),
    onSuccess: refresh,
  });
};

export interface OfferAnswer {
  answer: "accept" | "counter" | "decline";
  counter?: number;
  target: string;
}

/** The buyer's answer to a seller's counter. */
export const useAnswerOffer = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async ({ answer, counter, target }: OfferAnswer) =>
      unwrap(
        await supabase.rpc("answer_offer", {
          answer,
          counter: counter ?? undefined,
          target,
        })
      ),
    onSettled: refresh,
  });
};

export const useWithdrawOffer = () => {
  const { supabase } = useAuth();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("withdraw_offer", { target })),
    onSettled: refresh,
  });
};

/** Postgres' unique_violation: an offer on this listing is already live. */
export const isDuplicateOffer = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

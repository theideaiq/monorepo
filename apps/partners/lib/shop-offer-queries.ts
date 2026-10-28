"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Offers: buyers' offers on the shop's listings (the
 * buyer stays anonymous), answered within 48 hours, and which listings
 * take offers, with their automatic accept and decline amounts.
 */

type Condition = Database["public"]["Enums"]["product_condition"];

const offersKey = (sellerId: string) => ["shop-offers", sellerId] as const;
const settingsKey = (sellerId: string) => ["offer-settings", sellerId] as const;

const OFFER_COLUMNS =
  "id, number, status, amount, buyer_amount, seller_counter, buyer_counter, list_price, expires_at, condition, variant_id, created_at, product:products (name_en, name_ar)" as const;

/** The shop's offers of the last 30 days, newest first. */
export const useShopOffers = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("offers")
          .select(OFFER_COLUMNS)
          .eq("seller_id", sellerId)
          .gte(
            "created_at",
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          )
          .order("created_at", { ascending: false })
          .limit(100)
      ) ?? [],
    queryKey: offersKey(sellerId),
  });
};

export type ShopOffer = NonNullable<
  ReturnType<typeof useShopOffers>["data"]
>[number];

export const useOfferSettings = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("offer_settings")
          .select(
            "variant_id, condition, accept_offers, auto_accept_at, auto_decline_below"
          )
          .eq("seller_id", sellerId)
      ) ?? [],
    queryKey: settingsKey(sellerId),
  });
};

export type OfferSetting = NonNullable<
  ReturnType<typeof useOfferSettings>["data"]
>[number];

export interface OfferSettingInput {
  accept: boolean;
  acceptAt: number | null;
  condition: Condition;
  declineBelow: number | null;
  variantId: string;
}

export const useSetOfferSettings = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: OfferSettingInput) =>
      unwrap(
        await supabase.rpc("set_offer_settings", {
          accept: input.accept,
          accept_at: input.acceptAt ?? undefined,
          decline_below: input.declineBelow ?? undefined,
          seller: sellerId,
          variant: input.variantId,
          wanted: input.condition,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: settingsKey(sellerId) }),
  });
};

export interface ShopAnswer {
  answer: "accept" | "counter" | "decline";
  counter?: number;
  target: string;
}

/** Accept, decline or counter (once) a buyer's offer. */
export const useAnswerShopOffer = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ answer, counter, target }: ShopAnswer) =>
      unwrap(
        await supabase.rpc("answer_offer", {
          answer,
          counter: counter ?? undefined,
          target,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: offersKey(sellerId) }),
  });
};

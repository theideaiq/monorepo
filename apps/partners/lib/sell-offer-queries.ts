"use client";

import { useAuth } from "@repo/auth/provider";
import { getSellRequestPhotoUrls } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Get offers: members' items the shop can make an
 * offer on (first name and area only), the shop's offers with their
 * messages, and finishing a sale. Contact details are never shared.
 */

const openKey = (sellerId: string) => ["sell-open", sellerId] as const;
const offersKey = (sellerId: string) => ["sell-offers", sellerId] as const;

/** Open requests the shop can answer, newest first. */
export const useOpenSellRequests = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(await supabase.rpc("open_sell_requests", { seller: sellerId })) ??
      [],
    queryKey: openKey(sellerId),
  });
};

export type OpenSellRequest = NonNullable<
  ReturnType<typeof useOpenSellRequests>["data"]
>[number];

const OFFER_COLUMNS =
  "id, request_id, amount, check_method, pay_method, note, status, expires_at, created_at, messages:sell_messages (id, from_shop, body, created_at)" as const;

/** The shop's offers of the last 30 days, newest first. */
export const useShopSellOffers = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("sell_offers")
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
    refetchInterval: 60_000,
  });
};

export type ShopSellOffer = NonNullable<
  ReturnType<typeof useShopSellOffers>["data"]
>[number];

/** The item behind each of the shop's offers, open or not. */
export const useShopSellOfferItems = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase.rpc("shop_sell_offer_items", { seller: sellerId })
      ) ?? [],
    queryKey: [...offersKey(sellerId), "items"],
  });
};

export type ShopSellOfferItem = NonNullable<
  ReturnType<typeof useShopSellOfferItems>["data"]
>[number];

/** Signed links to a request's photos, while the shop may see them. */
export const useSellPhotos = (paths: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: paths.length > 0,
    queryFn: () => getSellRequestPhotoUrls(supabase, paths),
    queryKey: ["sell-photos", ...paths],
    staleTime: 30 * 60 * 1000,
  });
};

const useRefresh = (sellerId: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: openKey(sellerId) }),
      queryClient.invalidateQueries({ queryKey: offersKey(sellerId) }),
    ]);
};

export interface NewSellOffer {
  amount: number;
  checkMethod: "collect" | "drop_off";
  note: string;
  payMethod: "cash" | "transfer";
  requestId: string;
}

export const useMakeSellOffer = (sellerId: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(sellerId);
  return useMutation({
    mutationFn: async (offer: NewSellOffer) =>
      unwrap(
        await supabase.rpc("make_sell_offer", {
          amount: offer.amount,
          check_method: offer.checkMethod,
          note: offer.note || undefined,
          pay_method: offer.payMethod,
          request: offer.requestId,
          seller: sellerId,
        })
      ),
    onSettled: refresh,
  });
};

type OfferAction = "done" | "callOff" | "withdraw";

/** Withdraw a waiting offer; after acceptance, mark it done or call it off. */
export const useSellOfferAction = (sellerId: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(sellerId);
  return useMutation({
    mutationFn: async ({
      action,
      target,
    }: {
      action: OfferAction;
      target: string;
    }) =>
      action === "withdraw"
        ? unwrap(await supabase.rpc("withdraw_sell_offer", { target }))
        : unwrap(
            await supabase.rpc("finish_sell_offer", {
              done: action === "done",
              target,
            })
          ),
    onSettled: refresh,
  });
};

export const useSendSellMessage = (sellerId: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(sellerId);
  return useMutation({
    mutationFn: async ({ body, target }: { body: string; target: string }) =>
      unwrap(await supabase.rpc("send_sell_message", { body, target })),
    onSettled: refresh,
  });
};

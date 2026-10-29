"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { uploadAuctionPhoto } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Auctions: putting a copy up for auction (the shop's
 * own photos, a condition description, a start price, an optional hidden
 * reserve, 3 to 10 days), following its bids, and after an unpaid win
 * offering it to the next bidder or closing it. Bidders stay anonymous.
 */

type Condition = Database["public"]["Enums"]["product_condition"];
export type AuctionMark = Database["public"]["Enums"]["auction_mark"];
export type AuctionStatus = Database["public"]["Enums"]["auction_status"];

/** How long an auction runs, in days. */
export const AUCTION_DAYS = [3, 5, 7, 10] as const;
export const AUCTION_MARKS: readonly AuctionMark[] = [
  "signed",
  "limited",
  "rare",
];
/** Photos per auction (the database enforces it). */
export const MIN_PHOTOS = 3;
export const MAX_PHOTOS = 12;

const auctionsKey = (sellerId: string) => ["shop-auctions", sellerId] as const;

const AUCTION_COLUMNS =
  "id, number, status, condition, mark, mark_review, start_price, current_price, bid_count, has_reserve, reserve_met, days, ends_at, final_price, pay_by, second_chance, created_at, product:products (name_en, name_ar), reserve:auction_reserves (reserve_price)" as const;

/** The shop's auctions of the last 90 days, newest first. */
export const useShopAuctions = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () => {
      await supabase.rpc("settle_auctions");
      return (
        unwrap(
          await supabase
            .from("auctions")
            .select(AUCTION_COLUMNS)
            .eq("seller_id", sellerId)
            .gte(
              "created_at",
              new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
            )
            .order("created_at", { ascending: false })
            .limit(100)
        ) ?? []
      );
    },
    queryKey: auctionsKey(sellerId),
  });
};

export type ShopAuction = NonNullable<
  ReturnType<typeof useShopAuctions>["data"]
>[number];

/** The store's minimum start price for an auction (IQD). */
export const useAuctionMinimum = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("store_settings")
          .select("auction_min_start")
          .maybeSingle()
      )?.auction_min_start ?? 25_000,
    queryKey: ["auction-minimum"],
  });
};

export interface NewAuction {
  condition: Condition;
  days: number;
  mark: AuctionMark | null;
  note: string;
  photos: File[];
  reserve: number | null;
  startPrice: number;
  variantId: string;
}

/** Uploads the photos to the shop's folder, then starts the auction. */
export const useStartAuction = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auction: NewAuction) => {
      const uploaded = await Promise.all(
        auction.photos.map((file) =>
          uploadAuctionPhoto(supabase, sellerId, file)
        )
      );
      return unwrap(
        await supabase.rpc("start_auction", {
          condition_note: auction.note,
          copy_mark: auction.mark ?? undefined,
          days: auction.days,
          photos: uploaded.map((file) => file.path),
          reserve: auction.reserve ?? undefined,
          seller: sellerId,
          start_price: auction.startPrice,
          variant: auction.variantId,
          wanted: auction.condition,
        })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: auctionsKey(sellerId) }),
  });
};

type AuctionAction = "cancel_auction" | "close_auction" | "offer_second_chance";

/** Cancel (before any bid), offer a second chance or close an unpaid one. */
export const useAuctionAction = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      action,
      target,
    }: {
      action: AuctionAction;
      target: string;
    }) => unwrap(await supabase.rpc(action, { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: auctionsKey(sellerId) }),
  });
};

/** The database's refusal, when it is one of ours (a check violation). */
export const auctionRefusal = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23514" &&
  "message" in error
    ? String(error.message)
    : null;

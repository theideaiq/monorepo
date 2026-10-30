"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Auctions (migrations `20270307000000_auctions.sql` and
 * `20270308000000_auction_checkout.sql`): a seller's copy, its photos and
 * condition, proxy bidding by maximum, and a win paid through the cart
 * within 48 hours. Auctions are public without who bids; a bidder sees
 * their own bids. Pages settle what's due (`settle_auctions`) before they
 * read, so an ended auction shows its outcome without waiting for the cron.
 */

export type AuctionStatus = Database["public"]["Enums"]["auction_status"];
type Supabase = ReturnType<typeof useAuth>["supabase"];

const AUCTION_COLUMNS =
  "id, number, status, condition, photos, condition_note, mark, start_price, current_price, bid_count, has_reserve, reserve_met, days, starts_at, ends_at, final_price, pay_by, seller:sellers (name, is_house), product:products (slug, name_en, name_ar, images)" as const;

/** Applies the deadlines that have passed; a failure never blocks reading. */
const settle = async (supabase: Supabase) => {
  await supabase.rpc("settle_auctions");
};

const auctionsKey = ["auctions"] as const;

/** Every live auction, ending soonest first (Store → Auctions). */
export const useLiveAuctions = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      await settle(supabase);
      return (
        unwrap(
          await supabase
            .from("auctions")
            .select(AUCTION_COLUMNS)
            .eq("status", "live")
            .order("ends_at")
            .limit(60)
        ) ?? []
      );
    },
    queryKey: [...auctionsKey, "live"],
  });
};

export type Auction = NonNullable<
  ReturnType<typeof useLiveAuctions>["data"]
>[number];

/** A product's live auctions, next to its normal offers. */
export const useProductAuctions = (productId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(productId),
    queryFn: async () => {
      await settle(supabase);
      return (
        unwrap(
          await supabase
            .from("auctions")
            .select(AUCTION_COLUMNS)
            .eq("product_id", productId)
            .eq("status", "live")
            .order("ends_at")
        ) ?? []
      );
    },
    queryKey: [...auctionsKey, "product", productId],
  });
};

const auctionKey = (number: number) => [...auctionsKey, number] as const;

/** One auction by its number, with its history by alias. */
export const useAuction = (number: number) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useQuery({
    enabled: Number.isInteger(number) && number > 0,
    queryFn: async () => {
      await settle(supabase);
      // Settling can put a win in the cart: read the cart again after it.
      queryClient.invalidateQueries({
        queryKey: cartAuctionsKey(user?.id ?? ""),
      });
      const auction = unwrap(
        await supabase
          .from("auctions")
          .select(AUCTION_COLUMNS)
          .eq("number", number)
          .maybeSingle()
      );
      if (!auction) {
        return null;
      }
      const history =
        unwrap(
          await supabase
            .from("bid_events")
            .select("id, alias, amount, created_at")
            .eq("auction_id", auction.id)
            .order("id", { ascending: false })
            .limit(50)
        ) ?? [];
      return { auction, history };
    },
    queryKey: auctionKey(number),
    // The price moves while it runs.
    refetchInterval: 30_000,
  });
};

const myBidsKey = (userId: string) => ["bids", userId] as const;

const BID_COLUMNS =
  "auction_id, alias, max_amount, amount, winning, outcome, updated_at, auction:auctions (id, number, status, current_price, final_price, pay_by, ends_at, second_chance, product:products (slug, name_en, name_ar, images))" as const;

/** The member's bids, latest first (Saved → Bids). */
export const useMyBids = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      await settle(supabase);
      return (
        unwrap(
          await supabase
            .from("bids")
            .select(BID_COLUMNS)
            .eq("bidder_id", requireUserId(user?.id))
            .order("updated_at", { ascending: false })
            .limit(30)
        ) ?? []
      );
    },
    queryKey: myBidsKey(user?.id ?? ""),
  });
};

export type MyBid = NonNullable<ReturnType<typeof useMyBids>["data"]>[number];

/** The member's own bid on one auction, if any. */
export const useMyBid = (auctionId: string | undefined) => {
  const bids = useMyBids();
  return bids.data?.find((bid) => bid.auction_id === auctionId) ?? null;
};

export interface BidResult {
  current_price: number;
  ends_at: string;
  max_amount: number;
  reserve_met: boolean;
  winning: boolean;
}

/** Sets the member's maximum; the system bids for them up to it. */
export const usePlaceBid = (number: number) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      auctionId,
      maximum,
    }: {
      auctionId: string;
      maximum: number;
    }) =>
      unwrap(
        await supabase.rpc("place_bid", { maximum, target: auctionId })
      ) as unknown as BidResult,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: auctionKey(number) }),
        queryClient.invalidateQueries({
          queryKey: myBidsKey(user?.id ?? ""),
        }),
      ]),
  });
};

/**
 * The step from one bid to the next by the price showing, as
 * `private.bid_increment` (IQD).
 */
export const bidIncrement = (price: number) => {
  if (price < 50_000) {
    return 1000;
  }
  if (price < 100_000) {
    return 2500;
  }
  if (price < 250_000) {
    return 5000;
  }
  if (price < 500_000) {
    return 10_000;
  }
  if (price < 1_000_000) {
    return 25_000;
  }
  return 50_000;
};

/** The lowest maximum a new bidder can set now. */
export const minimumBid = (
  auction: Pick<Auction, "bid_count" | "current_price" | "start_price">
) =>
  auction.bid_count === 0 || auction.current_price === null
    ? auction.start_price
    : auction.current_price + bidIncrement(auction.current_price);

/** Milliseconds left, never below zero. */
export const timeLeft = (endsAt: string, now = Date.now()) =>
  Math.max(0, new Date(endsAt).getTime() - now);

/** Postgres' error message for a failed bid, to show as is when it's ours. */
export const bidError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23514" &&
  "message" in error &&
  typeof error.message === "string"
    ? error.message
    : null;

// ── In the cart ──────────────────────────────────────────────────────────

const cartAuctionsKey = (userId: string) => [
  ...queryKeys.cart(userId),
  "auctions",
];

/** Won auctions waiting in the cart (`cart_auctions`). */
export const useCartAuctions = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("cart_auctions")
          .select(
            "auction_id, auction:auctions (id, number, status, final_price, pay_by, product:products (slug, name_en, name_ar))"
          )
          .order("created_at")
      ) ?? [],
    queryKey: cartAuctionsKey(user?.id ?? ""),
  });
};

/** A won auction, priced for the cart and checkout (the server's quote decides). */
export interface AuctionLine {
  amount: number;
  auctionId: string;
  name: { name_ar: string; name_en: string } | null;
  number: number;
  payBy: string | null;
}

/** The cart's won auctions that can still be paid. */
export const useCartAuctionLines = (): AuctionLine[] =>
  (useCartAuctions().data ?? []).flatMap((row) =>
    row.auction?.status === "won" && row.auction.final_price !== null
      ? [
          {
            amount: row.auction.final_price,
            auctionId: row.auction_id,
            name: row.auction.product ?? null,
            number: row.auction.number,
            payBy: row.auction.pay_by,
          },
        ]
      : []
  );

/** Puts a win back in the cart (while it can still be paid). */
export const useAddCartAuction = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      unwrap(
        await supabase
          .from("cart_auctions")
          .upsert({ auction_id: auctionId }, { ignoreDuplicates: true })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export const useRemoveCartAuction = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      unwrap(
        await supabase
          .from("cart_auctions")
          .delete()
          .eq("auction_id", auctionId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

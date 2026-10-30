"use client";

import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";
import { useListings } from "./listing-queries";
import { unwrap } from "./queries";
import { useShopAuctions } from "./shop-auction-queries";
import { useShopOffers } from "./shop-offer-queries";
import { useShopLines } from "./shop-order-queries";
import { useParcelsBack, useShopReturns } from "./shop-return-queries";
import { actionCounts, type ShopRows } from "./today";

/**
 * Today's data: the same queries the Sell pages use (so their caches are
 * shared), and the reviews of the shop's products for its rating.
 */

/** Approved reviews of the products the shop lists (product_ratings). */
export const useShopRatings = (productIds: readonly string[]) => {
  const { supabase } = useAuth();
  const ids = [...new Set(productIds)].sort();
  return useQuery({
    enabled: ids.length > 0,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("product_ratings")
          .select("average, count")
          .in("product_id", ids)
      ) ?? [],
    queryKey: ["shop-ratings", ...ids],
  });
};

/** What needs the shop: the rows behind its tasks, once all have loaded. */
export const useShopTasks = (sellerId: string) => {
  const offers = useShopOffers(sellerId);
  const lines = useShopLines(sellerId);
  const returns = useShopReturns(sellerId);
  const parcels = useParcelsBack(sellerId);
  const auctions = useShopAuctions(sellerId);
  const listings = useListings(sellerId);
  const queries = [offers, lines, returns, parcels, auctions, listings];
  const rows: ShopRows | null =
    offers.data &&
    lines.data &&
    returns.data &&
    parcels.data &&
    auctions.data &&
    listings.data
      ? {
          auctions: auctions.data,
          lines: lines.data,
          listings: listings.data,
          offers: offers.data,
          parcels: parcels.data,
          returns: returns.data,
        }
      : null;
  return {
    isError: queries.some((query) => query.isError),
    isPending: Boolean(sellerId) && queries.some((query) => query.isPending),
    refetch: () => {
      for (const query of queries) {
        if (query.isError) {
          query.refetch();
        }
      }
    },
    rows,
  };
};

/** The side menu's counts (offers, orders to pack, returns). */
export const useActionCounts = (sellerId: string) => {
  const offers = useShopOffers(sellerId);
  const lines = useShopLines(sellerId);
  const returns = useShopReturns(sellerId);
  const parcels = useParcelsBack(sellerId);
  if (!(offers.data && lines.data && returns.data && parcels.data)) {
    return null;
  }
  return actionCounts({
    lines: lines.data,
    offers: offers.data,
    parcels: parcels.data,
    returns: returns.data,
  });
};

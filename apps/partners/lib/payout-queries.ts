"use client";

import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Payouts: what The IDEA paid the shop each week, with
 * the statement behind each payout.
 */

const PAYOUT_COLUMNS =
  "id, number, status, period_end, amount, method, reference, paid_at, created_at, lines:payout_lines (id, kind, amount, order_item_id, covers_until)" as const;

export const useShopPayouts = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("payouts")
          .select(PAYOUT_COLUMNS)
          .eq("seller_id", sellerId)
          .neq("status", "cancelled")
          .order("created_at", { ascending: false })
          .limit(52)
      ) ?? [],
    queryKey: ["shop-payouts", sellerId],
  });
};

export type ShopPayout = NonNullable<
  ReturnType<typeof useShopPayouts>["data"]
>[number];

"use client";

import { useAuth } from "@repo/auth/provider";
import type { Tables } from "@repo/database";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** The signed-in member's Bulbs, tier and progress (`my_bulbs()`). */
export const useMyBulbs = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const rows = unwrap(await supabase.rpc("my_bulbs"));
      return rows?.[0] ?? null;
    },
    queryKey: queryKeys.bulbs(user?.id ?? ""),
  });
};

export type BulbEntry = Pick<
  Tables<"bulb_entries">,
  | "amount"
  | "available_at"
  | "created_at"
  | "id"
  | "kind"
  | "order_id"
  | "payment_id"
  | "reason"
  | "status"
>;

/** The member's Bulbs history, newest first (RLS: own rows only). */
export const useBulbEntries = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("bulb_entries")
          .select(
            "id, amount, kind, status, reason, order_id, payment_id, available_at, created_at"
          )
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
          .limit(100)
      ) as BulbEntry[],
    queryKey: queryKeys.bulbEntries(user?.id ?? ""),
  });
};

/** Every tier with its threshold and rate (public). */
export const useBulbTiers = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("bulb_tiers")
          .select("tier, min_spend, rate, free_delivery_from")
          .order("min_spend")
      ) ?? [],
    queryKey: queryKeys.bulbTiers,
    staleTime: 60 * 60 * 1000,
  });
};

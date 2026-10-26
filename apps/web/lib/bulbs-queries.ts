"use client";

import { useAuth } from "@repo/auth/provider";
import type { Tables } from "@repo/database";
import { useQuery } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** The signed-in member's Bulbs and cashback rate (`my_bulbs()`). */
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

/**
 * How Bulbs are earned (public): the store's rate, the price above which
 * items earn half, the return window, and each Plus plan's rate.
 */
export const useBulbRules = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [settings, plans] = await Promise.all([
        supabase
          .from("store_settings")
          .select("bulb_rate, bulb_half_from, return_days")
          .single(),
        supabase
          .from("plans")
          .select("id, name, name_ar, bulb_rate, amount")
          .eq("active", true)
          .eq("audience", "plus")
          .not("bulb_rate", "is", null)
          .order("amount"),
      ]);
      const row = unwrap(settings);
      if (!row) {
        throw new Error("Store settings are missing");
      }
      return {
        halfFrom: row.bulb_half_from,
        plans: unwrap(plans) ?? [],
        rate: Number(row.bulb_rate),
        returnDays: row.return_days,
      };
    },
    queryKey: queryKeys.bulbRules,
    staleTime: 60 * 60 * 1000,
  });
};

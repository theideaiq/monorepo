"use client";

import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Supply: a supplier shop's copies lent to the Plus pool and kit
 * units lent to game nights (every member), and, for owners and admins, its
 * fees and what each rental or booking earned. Row Level Security keeps the
 * fees and earnings to owners, admins and staff.
 */

export const useSupplyItems = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(await supabase.rpc("supply_items", { shop: sellerId })) ?? [],
    queryKey: ["supply-items", sellerId],
  });
};

export type SupplyItem = NonNullable<
  ReturnType<typeof useSupplyItems>["data"]
>[number];

/** The shop's fees (null for members, or before staff set them). */
export const useSupplyTerms = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("supply_terms")
          .select("rental_fee, kit_fee, active, note, updated_at")
          .eq("seller_id", sellerId)
          .maybeSingle()
      ),
    queryKey: ["supply-terms", sellerId],
  });
};

/** The latest fees earned, newest first. */
export const useSupplyEarnings = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("supply_earnings")
          .select("id, kind, label, fee, earned_on, payout_line_id")
          .eq("seller_id", sellerId)
          .order("earned_on", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(100)
      ) ?? [],
    queryKey: ["supply-earnings", sellerId],
  });
};

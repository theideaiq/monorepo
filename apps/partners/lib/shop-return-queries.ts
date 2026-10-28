"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { getReturnPhotoUrl } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Returns: the shop's returns (the customer only as
 * "first name · area"), its answer within 48 hours, its check of what came
 * back, and refused parcels to confirm.
 */

export type ShopReturn =
  Database["public"]["Functions"]["seller_returns"]["Returns"][number];
export type ParcelBack =
  Database["public"]["Functions"]["seller_parcels_back"]["Returns"][number];

const returnsKey = (sellerId: string) => ["shop-returns", sellerId] as const;
const parcelsKey = (sellerId: string) => ["parcels-back", sellerId] as const;

export const useShopReturns = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(await supabase.rpc("seller_returns", { shop: sellerId })) ?? [],
    queryKey: returnsKey(sellerId),
  });
};

export const useParcelsBack = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(await supabase.rpc("seller_parcels_back", { shop: sellerId })) ??
      [],
    queryKey: parcelsKey(sellerId),
  });
};

/** Signed links to a return's photos (the bucket is private). */
export const useReturnPhotos = (paths: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: paths.length > 0,
    queryFn: () =>
      Promise.all(paths.map((path) => getReturnPhotoUrl(supabase, path))),
    queryKey: ["return-photos", ...paths],
    staleTime: 5 * 60 * 1000,
  });
};

/** Accept, or dispute with a reason. */
export const useRespondToReturn = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      accept: boolean;
      note: string;
      target: string;
    }) => unwrap(await supabase.rpc("respond_to_return", input)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: returnsKey(sellerId) }),
  });
};

/** The item is back: fine, or what's wrong with it (Staff decide). */
export const useConfirmCondition = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { note: string; ok: boolean; target: string }) =>
      unwrap(await supabase.rpc("confirm_return_condition", input)),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: returnsKey(sellerId) }),
  });
};

export const useConfirmParcelBack = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (parcel: string) =>
      unwrap(await supabase.rpc("confirm_parcel_back", { parcel })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: parcelsKey(sellerId) }),
  });
};

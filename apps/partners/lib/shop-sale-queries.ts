"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Selling → Sales and deals: a listing's sale price between two
 * dates (sales of one listing never overlap), and quantity deals, a share
 * off each copy from a quantity on.
 */

type Condition = Database["public"]["Enums"]["product_condition"];

const salesKey = (sellerId: string) => ["listing-sales", sellerId] as const;
const dealsKey = (sellerId: string) => ["quantity-deals", sellerId] as const;

/** The shop's running and coming sales, soonest first. */
export const useListingSales = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("listing_sales")
          .select("id, variant_id, condition, sale_price, starts_at, ends_at")
          .eq("seller_id", sellerId)
          .gt("ends_at", new Date().toISOString())
          .order("starts_at")
      ) ?? [],
    queryKey: salesKey(sellerId),
  });
};

export type ListingSale = NonNullable<
  ReturnType<typeof useListingSales>["data"]
>[number];

export const useQuantityDeals = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("quantity_deals")
          .select("id, variant_id, condition, min_quantity, discount_rate")
          .eq("seller_id", sellerId)
          .order("min_quantity")
      ) ?? [],
    queryKey: dealsKey(sellerId),
  });
};

export type QuantityDeal = NonNullable<
  ReturnType<typeof useQuantityDeals>["data"]
>[number];

export interface SaleInput {
  condition: Condition;
  ends: string;
  price: number;
  starts: string;
  variantId: string;
}

export const useSetSale = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaleInput) =>
      unwrap(
        await supabase.rpc("set_listing_sale", {
          ends: input.ends,
          price: input.price,
          seller: sellerId,
          starts: input.starts,
          variant: input.variantId,
          wanted: input.condition,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: salesKey(sellerId) }),
  });
};

export const useEndSale = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("end_listing_sale", { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: salesKey(sellerId) }),
  });
};

export interface DealInput {
  condition: Condition;
  fromQuantity: number;
  rate: number;
  variantId: string;
}

export const useSetDeal = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: DealInput) =>
      unwrap(
        await supabase.rpc("set_quantity_deal", {
          from_quantity: input.fromQuantity,
          rate: input.rate,
          seller: sellerId,
          variant: input.variantId,
          wanted: input.condition,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: dealsKey(sellerId) }),
  });
};

export const useDeleteDeal = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("delete_quantity_deal", { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: dealsKey(sellerId) }),
  });
};

/** Postgres' unique_violation: another sale of the listing overlaps. */
export const isOverlap = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

/** A day in Baghdad (UTC+3, no daylight saving) as a timestamp. */
export const baghdadDay = (day: string, end = false) =>
  `${day}T${end ? "23:59:59" : "00:00:00"}+03:00`;

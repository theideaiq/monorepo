"use client";

import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Renting one item on its own (the single-rent migration): a price for a
 * set number of days, a refundable deposit, and a fee for each day late.
 */
export interface RentalQuote {
  days: number;
  deposit: number;
  /** IQD per day past the due date, taken from the deposit at return. */
  lateFee: number;
  price: number;
}

/** The days late after which an unreturned item is charged at its used price. */
export const KEEP_AFTER_LATE_DAYS = 14;

/** rental_quote(): null when the item can't be rented on its own. */
export const useRentalQuote = (
  productId: string | null,
  variantId: string | null = null
) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(productId),
    queryFn: async (): Promise<RentalQuote | null> => {
      const row = unwrap(
        await supabase
          .rpc("rental_quote", {
            product: productId ?? "",
            ...(variantId ? { variant: variantId } : {}),
          })
          .maybeSingle()
      );
      return row
        ? {
            days: row.days,
            deposit: row.deposit,
            lateFee: row.late_fee,
            price: row.price,
          }
        : null;
    },
    queryKey: ["rental-quote", productId ?? "", variantId ?? ""],
    staleTime: 5 * 60_000,
  });
};

/** keep_price(): what keeping a Plus rental's copy costs. */
export const useKeepPrice = (rentalId: string | null) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(rentalId),
    queryFn: async () =>
      unwrap(await supabase.rpc("keep_price", { target: rentalId ?? "" })),
    queryKey: ["keep-price", rentalId ?? ""],
  });
};

/** Where the rent checkout for a product lives. */
export const rentPath = (slug: string, variant?: string | null) =>
  `/rent/${encodeURIComponent(slug)}${
    variant ? `?variant=${encodeURIComponent(variant)}` : ""
  }`;

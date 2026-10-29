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

/** Up to this many films, books or games rent together for one delivery fee. */
export const RENT_TOGETHER_MAX = 3;

/** The top-level categories whose items rent together. */
const RENT_TOGETHER = new Set(["films", "books", "games", "board-games"]);

interface CategoryRow {
  readonly id: string;
  readonly parent_id?: string | null;
  readonly slug: string;
}

/** Whether a category's items rent together (subcategories follow their parent). */
export const rentsTogether = (
  categoryId: string | null | undefined,
  categories: readonly CategoryRow[]
) => {
  const category = categories.find((row) => row.id === categoryId);
  const top = category?.parent_id
    ? categories.find((row) => row.id === category.parent_id)
    : category;
  return top ? RENT_TOGETHER.has(top.slug) : false;
};

/** One item of a rental order. */
export interface RentalItem {
  productId: string;
  variantId: string | null;
}

/** rentals_quote(): the order of 1 to 3 items, priced. */
export interface RentalsQuote {
  deposit: number;
  /** Null before a zone is chosen; 0 when delivery is free. */
  fee: number | null;
  /** The zone's free-delivery threshold on the rent, if any. */
  freeFrom: number | null;
  /** Per-term items (textbooks) are due on `until`, the term's last day. */
  items: (RentalQuote & RentalItem & { until: string | null })[];
  rent: number;
  total: number;
}

/** The `items` argument of rentals_quote() and create_rentals_order(). */
export const rentalItemsParam = (items: readonly RentalItem[]) =>
  items.map((item) => ({
    product: item.productId,
    ...(item.variantId ? { variant: item.variantId } : {}),
  }));

interface QuoteRow {
  deposit: number;
  fee: number | null;
  free_from: number | null;
  items: {
    days: number;
    deposit: number;
    late_fee: number;
    price: number;
    product: string;
    until: string | null;
    variant: string | null;
  }[];
  rent: number;
  total: number;
}

export const useRentalsQuote = (
  items: readonly RentalItem[],
  zoneId: string | null
) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: items.length > 0,
    placeholderData: (previous) => previous,
    queryFn: async (): Promise<RentalsQuote> => {
      const row = unwrap(
        await supabase.rpc("rentals_quote", {
          items: rentalItemsParam(items),
          ...(zoneId ? { delivery_zone: zoneId } : {}),
        })
      ) as unknown as QuoteRow;
      return {
        deposit: row.deposit,
        fee: row.fee,
        freeFrom: row.free_from,
        items: row.items.map((item) => ({
          days: item.days,
          deposit: item.deposit,
          lateFee: item.late_fee,
          price: item.price,
          productId: item.product,
          until: item.until,
          variantId: item.variant,
        })),
        rent: row.rent,
        total: row.total,
      };
    },
    queryKey: [
      "rentals-quote",
      items.map((item) => `${item.productId}:${item.variantId ?? ""}`),
      zoneId ?? "",
    ],
  });
};

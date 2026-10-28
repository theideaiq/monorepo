"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Partners → Selling → Listings: find a product by barcode or title, add
 * the shop's offer to it, or create the product when nobody has. Shops
 * never edit products; they flag wrong details. The database checks who
 * may list (owners and admins of an approved shop).
 */

export type Condition = Database["public"]["Enums"]["product_condition"];
export type Listing =
  Database["public"]["Functions"]["seller_listings"]["Returns"][number];

export const CONDITIONS: readonly Condition[] = [
  "new",
  "open_box",
  "used",
  "refurbished",
];

/** At most this many copies in one offer (the database enforces it). */
export const MAX_QUANTITY = 999;
/** The lowest price an offer may have, in IQD. */
export const MIN_PRICE = 250;

const listingsKey = (sellerId: string) => ["listings", sellerId] as const;

const unwrap = <T>({ data, error }: { data: T; error: unknown }) => {
  if (error) {
    throw error;
  }
  return data;
};

const CODE = /^[\d\s-]{8,20}[\dXx]?$/;
const DIGITS = /\d/g;

/** Whether what was typed looks like a barcode or ISBN rather than a title. */
export const looksLikeCode = (value: string) => {
  const trimmed = value.trim();
  return CODE.test(trimmed) && (trimmed.match(DIGITS)?.length ?? 0) >= 8;
};

export interface CatalogMatch {
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  variants: { id: string; labelAr: string | null; labelEn: string | null }[];
}

const MATCH_COLUMNS =
  "id, slug, name_en, name_ar, product_variants (id, label_en, label_ar, active)";

interface MatchRow {
  id: string;
  name_ar: string;
  name_en: string;
  product_variants: {
    active: boolean;
    id: string;
    label_ar: string | null;
    label_en: string | null;
  }[];
  slug: string;
}

const toMatch = (row: MatchRow): CatalogMatch => ({
  id: row.id,
  nameAr: row.name_ar,
  nameEn: row.name_en,
  slug: row.slug,
  variants: row.product_variants
    .filter((variant) => variant.active)
    .map((variant) => ({
      id: variant.id,
      labelAr: variant.label_ar,
      labelEn: variant.label_en,
    })),
});

// PostgREST filter syntax: commas and brackets would break `or=(…)`.
const FILTER_CHARACTERS = /[,()*%]/g;

/**
 * Products matching a barcode (exactly that variant) or a title (up to 10
 * active products). Undefined until something is searched.
 */
export const useCatalogSearch = (query: string) => {
  const { supabase } = useAuth();
  const term = query.trim();
  return useQuery({
    enabled: term.length >= 2,
    queryFn: async (): Promise<{ code: boolean; matches: CatalogMatch[] }> => {
      if (looksLikeCode(term)) {
        const found = unwrap(
          await supabase.rpc("find_by_barcode", { code: term })
        );
        const match = found?.[0];
        if (!match) {
          return { code: true, matches: [] };
        }
        const row = unwrap(
          await supabase
            .from("products")
            .select(MATCH_COLUMNS)
            .eq("id", match.product_id)
            .single()
        ) as MatchRow;
        const only = toMatch(row);
        return {
          code: true,
          matches: [
            {
              ...only,
              variants: only.variants.filter(
                (variant) => variant.id === match.variant_id
              ),
            },
          ],
        };
      }
      const safe = term.replaceAll(FILTER_CHARACTERS, " ");
      const rows = unwrap(
        await supabase
          .from("products")
          .select(MATCH_COLUMNS)
          .eq("status", "active")
          .or(`name_en.ilike.*${safe}*,name_ar.ilike.*${safe}*`)
          .order("name_en")
          .limit(10)
      ) as MatchRow[];
      return { code: false, matches: rows.map(toMatch) };
    },
    queryKey: ["catalog-search", term],
  });
};

/** The categories a new product can go in. */
export const useCategories = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("product_categories")
          .select("id, slug, name_en, name_ar")
          .order("position")
      ),
    queryKey: ["product-categories"],
  });
};

/** The shop's offers with their copies (seller_listings). */
export const useListings = (sellerId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(sellerId),
    queryFn: async () =>
      unwrap(
        await supabase.rpc("seller_listings", { listing_seller: sellerId })
      ),
    queryKey: listingsKey(sellerId),
  });
};

export interface OfferInput {
  condition: Condition;
  price: number;
  quantity: number;
  sku: string;
}

/** Adds or changes an offer on a variant (0 copies pauses it). */
export const useSetOffer = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      variantId,
      ...offer
    }: OfferInput & { variantId: string }) =>
      unwrap(
        await supabase.rpc("set_offer", {
          offer_condition: offer.condition,
          offer_price: offer.price,
          offer_seller: sellerId,
          offer_sku: offer.sku.trim() || undefined,
          offer_variant: variantId,
          quantity: offer.quantity,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: listingsKey(sellerId) }),
  });
};

export interface NewProduct {
  barcode: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
}

/** Creates a product nobody has listed, with the shop's offer. */
export const useCreateListing = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      product,
      offer,
    }: {
      offer: OfferInput;
      product: NewProduct;
    }) =>
      unwrap(
        await supabase.rpc("create_listing", {
          barcode: product.barcode.trim(),
          category: product.categoryId,
          details: {},
          images: [],
          listing_seller: sellerId,
          name_ar: product.nameAr.trim(),
          name_en: product.nameEn.trim(),
          offer_condition: offer.condition,
          offer_price: offer.price,
          offer_sku: offer.sku.trim() || undefined,
          quantity: offer.quantity,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: listingsKey(sellerId) }),
  });
};

/** Tells staff a product's details are wrong. */
export const useFlagProduct = (sellerId: string) => {
  const { supabase, user } = useAuth();
  return useMutation({
    mutationFn: async ({
      note,
      productId,
    }: {
      note: string;
      productId: string;
    }) => {
      unwrap(
        await supabase.from("product_flags").insert({
          flagged_by: user?.id ?? null,
          note: note.trim(),
          product_id: productId,
          seller_id: sellerId,
        })
      );
    },
  });
};

export type ListingProblem =
  | "exists"
  | "invalidBarcode"
  | "notAllowed"
  | "unknown";

const messageOf = (error: unknown) =>
  typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : "";

/** The database's refusals, as messages the screen translates. */
export const toListingProblem = (error: unknown): ListingProblem => {
  const message = messageOf(error);
  if (message.includes("Product exists")) {
    return "exists";
  }
  if (message.includes("Invalid barcode")) {
    return "invalidBarcode";
  }
  if (message.includes("approved shop")) {
    return "notAllowed";
  }
  return "unknown";
};

/** Checks an offer as the database will; returns what's wrong, if anything. */
export const offerProblem = (
  offer: OfferInput
): "price" | "quantity" | null => {
  if (!Number.isInteger(offer.price) || offer.price < MIN_PRICE) {
    return "price";
  }
  if (
    !Number.isInteger(offer.quantity) ||
    offer.quantity < 0 ||
    offer.quantity > MAX_QUANTITY
  ) {
    return "quantity";
  }
  return null;
};

const LOOKUP_BATCH = 5;

export interface UploadMatch {
  nameAr: string;
  nameEn: string;
  variantId: string;
}

/**
 * Finds the variant for each barcode of an upload (a few at a time); a
 * barcode nobody has is left out of the map.
 */
export const useMatchUpload = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (
      barcodes: readonly string[]
    ): Promise<Map<string, UploadMatch>> => {
      const matches = new Map<string, UploadMatch>();
      const unique = [...new Set(barcodes)];
      for (let start = 0; start < unique.length; start += LOOKUP_BATCH) {
        // biome-ignore lint/performance/noAwaitInLoops: a few lookups at a time
        await Promise.all(
          unique.slice(start, start + LOOKUP_BATCH).map(async (code) => {
            const found = unwrap(
              await supabase.rpc("find_by_barcode", { code })
            )?.[0];
            if (found) {
              matches.set(code, {
                nameAr: found.name_ar,
                nameEn: found.name_en,
                variantId: found.variant_id,
              });
            }
          })
        );
      }
      return matches;
    },
  });
};

/** One upload row ready to send: an offer on a found variant, or a new product. */
export type UploadItem =
  | { line: number; offer: OfferInput; variantId: string }
  | { line: number; offer: OfferInput; product: NewProduct };

export interface UploadResult {
  line: number;
  problem: ListingProblem | null;
}

/**
 * Sends the rows one by one (each is its own offer, so one refusal
 * doesn't stop the rest) and reports how each went.
 */
export const useApplyUpload = (sellerId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      items,
      onProgress,
    }: {
      items: readonly UploadItem[];
      onProgress: (done: number) => void;
    }): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];
      for (const item of items) {
        const { offer } = item;
        const call =
          "variantId" in item
            ? supabase.rpc("set_offer", {
                offer_condition: offer.condition,
                offer_price: offer.price,
                offer_seller: sellerId,
                offer_sku: offer.sku.trim() || undefined,
                offer_variant: item.variantId,
                quantity: offer.quantity,
              })
            : supabase.rpc("create_listing", {
                barcode: item.product.barcode,
                category: item.product.categoryId,
                details: {},
                images: [],
                listing_seller: sellerId,
                name_ar: item.product.nameAr,
                name_en: item.product.nameEn,
                offer_condition: offer.condition,
                offer_price: offer.price,
                offer_sku: offer.sku.trim() || undefined,
                quantity: offer.quantity,
              });
        // biome-ignore lint/performance/noAwaitInLoops: one row at a time, so progress shows and one refusal stops nothing
        const { error } = await call;
        results.push({
          line: item.line,
          problem: error ? toListingProblem(error) : null,
        });
        onProgress(results.length);
      }
      return results;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: listingsKey(sellerId) }),
  });
};

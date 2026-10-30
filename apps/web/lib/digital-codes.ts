"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { isNativeApp } from "./platform";
import { queryKeys, unwrap } from "./queries";

/**
 * Digital codes (migration `20270316000000_digital_codes.sql`): gift cards
 * and store codes for one store region, bought on the website only, paid
 * online, revealed with a tap in Pass → Orders.
 */

export interface DigitalBrand {
  id: string;
  kind: string;
  name_ar: string;
  name_en: string;
  platform: string | null;
  products: DigitalProduct[];
  redeem_ar: string | null;
  redeem_en: string | null;
  region: string;
  region_ar: string;
  region_en: string;
  slug: string;
}

export interface DigitalProduct {
  face_currency: string;
  face_value: number;
  id: string;
  price: number;
}

/** "PlayStation · US store · USD 20", in the reader's language. */
export const codeName = (
  brand: Pick<DigitalBrand, "name_ar" | "name_en" | "region_ar" | "region_en">,
  product: Pick<DigitalProduct, "face_currency" | "face_value">,
  locale: Locale | string
) =>
  [
    locale === "ar" ? brand.name_ar : brand.name_en,
    locale === "ar" ? brand.region_ar : brand.region_en,
    `${product.face_currency} ${Number(product.face_value)}`,
  ].join(" · ");

/** The brands on sale and their denominations, cheapest first. */
export const useDigitalBrands = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const rows =
        (unwrap(
          await supabase
            .from("digital_brands")
            .select(
              "id, slug, name_en, name_ar, kind, platform, region, region_en, region_ar, redeem_en, redeem_ar, products:digital_products (id, face_value, face_currency, price)"
            )
            .eq("active", true)
            .order("position")
            .order("name_en")
        ) as unknown as DigitalBrand[] | null) ?? [];
      return rows.map((brand) => ({
        ...brand,
        products: [...brand.products].sort((a, b) => a.price - b.price),
      }));
    },
    queryKey: ["digital", "brands"],
    staleTime: 5 * 60_000,
  });
};

/**
 * Brands grouped by the store a code works in: per platform, its regions,
 * and the brands without a platform on their own.
 */
export const byPlatform = (brands: readonly DigitalBrand[]) => {
  const platforms = new Map<string, DigitalBrand[]>();
  const other: DigitalBrand[] = [];
  for (const brand of brands) {
    if (brand.platform) {
      platforms.set(brand.platform, [
        ...(platforms.get(brand.platform) ?? []),
        brand,
      ]);
    } else {
      other.push(brand);
    }
  }
  return { other, platforms };
};

/** The store regions the member's accounts are on, per platform. */
export const useStoreRegions = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const rows =
        unwrap(
          await supabase
            .from("digital_store_regions")
            .select("platform, region")
        ) ?? [];
      return new Map(rows.map((row) => [row.platform, row.region]));
    },
    queryKey: ["digital", "regions", user?.id ?? ""],
  });
};

export const useSetStoreRegion = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      platform,
      region,
    }: {
      platform: string;
      region: string;
    }) =>
      unwrap(
        await supabase.rpc("set_digital_store_region", { platform, region })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: ["digital", "regions", user?.id ?? ""],
      }),
  });
};

const cartDigitalKey = (userId: string) => [
  ...queryKeys.cart(userId),
  "digital",
];

export interface CartDigitalRow {
  product:
    | (DigitalProduct & {
        brand: Pick<
          DigitalBrand,
          "name_ar" | "name_en" | "region_ar" | "region_en"
        > | null;
      })
    | null;
  product_id: string;
  quantity: number;
}

/** The codes in the cart (`cart_digital`). */
export const useCartDigital = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("cart_digital")
          .select(
            "product_id, quantity, product:digital_products (id, face_value, face_currency, price, brand:digital_brands (name_en, name_ar, region_en, region_ar))"
          )
          .order("created_at")
      ) ?? []) as unknown as CartDigitalRow[],
    queryKey: cartDigitalKey(user?.id ?? ""),
  });
};

export interface DigitalLine {
  amount: number;
  name: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** The cart's codes, priced (the server's quote decides). */
export const useCartDigitalLines = (locale: Locale | string): DigitalLine[] =>
  (useCartDigital().data ?? []).flatMap((row) =>
    row.product?.brand
      ? [
          {
            amount: row.product.price * row.quantity,
            name: codeName(row.product.brand, row.product, locale),
            productId: row.product_id,
            quantity: row.quantity,
            unitPrice: row.product.price,
          },
        ]
      : []
  );

/** Puts a code in the cart, or one more of it (up to 5). */
export const useAddCodeToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      const userId = user?.id;
      if (!userId) {
        throw new Error("Not authenticated");
      }
      const existing = unwrap(
        await supabase
          .from("cart_digital")
          .select("quantity")
          .eq("product_id", productId)
          .maybeSingle()
      );
      if (existing) {
        unwrap(
          await supabase
            .from("cart_digital")
            .update({ quantity: Math.min(5, existing.quantity + 1) })
            .eq("product_id", productId)
        );
        return;
      }
      unwrap(
        await supabase
          .from("cart_digital")
          .insert({ product_id: productId, user_id: userId })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export const useRemoveCartCode = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      unwrap(
        await supabase.from("cart_digital").delete().eq("product_id", productId)
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export type CodeStatus =
  | "buying"
  | "cancelled"
  | "delivered"
  | "failed"
  | "held"
  | "invalid"
  | "pending"
  | "unpaid";

export interface OrderCode {
  delivered_at: string | null;
  id: string;
  order_item_id: string;
  revealed_at: string | null;
  status: CodeStatus;
}

/** An order's codes and where each is. */
export const useOrderCodes = (orderId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user) && orderId.length > 0,
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("digital_codes")
          .select("id, order_item_id, status, delivered_at, revealed_at")
          .eq("order_id", orderId)
          .order("created_at")
      ) ?? []) as OrderCode[],
    queryKey: ["digital", "order", orderId, user?.id ?? ""],
  });
};

/** The deliberate tap: the code and PIN, once delivered. */
export const useRevealCode = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (codeId: string) => {
      const rows = unwrap(
        await supabase.rpc("reveal_digital_code", { target: codeId })
      );
      return rows?.[0] ?? null;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["digital", "order"] }),
  });
};

const subscribe = () => () => undefined;

/**
 * Whether this is the iOS/Android app, for components also rendered on
 * the server: null until the browser knows, so nothing flashes. Codes are
 * sold on the website only.
 */
export const useInApp = (): boolean | null =>
  useSyncExternalStore(subscribe, isNativeApp, () => null);

"use server";

import type { Json } from "@repo/database";
import { z } from "zod";
import {
  ActionFailure,
  affected,
  check,
  staffAction,
} from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { callApi } from "@/lib/admin/api";
import { isRemoteCatalogImage } from "@/lib/admin/catalog-images";
import { MAX_IMAGES } from "@/lib/admin/catalog-import";

const BARCODE = /^\d{8,14}$/;

const FAMILIES = [
  "books",
  "music",
  "games",
  "films",
  "board-games",
  "trading-cards",
] as const;

const SOURCES = [
  "openlibrary",
  "googlebooks",
  "musicbrainz",
  "discogs",
  "igdb",
  "tmdb",
  "bgg",
  "scryfall",
  "pokemontcg",
] as const;

export interface LookupCandidate {
  barcode?: string;
  creator?: string;
  details: Record<string, string>;
  id: string;
  image?: string;
  source: (typeof SOURCES)[number];
  title: string;
  url: string;
  year?: number;
}

/** Looks the product up in its family's sources (apps/api /lookup). */
export const lookUpProduct = staffAction(
  "catalog",
  z.object({
    barcode: z.string().trim().max(30).optional(),
    creator: z.string().trim().max(200).optional(),
    family: z.enum(FAMILIES),
    text: z.string().trim().max(200).optional(),
  }),
  async ({ input, supabase }) => {
    const result = await callApi<{
      candidates: LookupCandidate[];
      failed: string[];
      sources: string[];
    }>(supabase, "/lookup", input);
    if (!result.ok) {
      throw new ActionFailure("apiUnavailable");
    }
    return success("saved", { data: result.data });
  },
  "read"
);

/**
 * Uses a found item: its source ID goes in `external_ids`, details the
 * product lacks are added, its picture is added (when the product has
 * none), and its barcode goes on the only variant when that has none.
 */
export const applyLookup = staffAction(
  "catalog",
  z.object({
    candidate: z
      .string()
      .max(20_000)
      .transform((value, context) => {
        try {
          return JSON.parse(value) as LookupCandidate;
        } catch {
          context.addIssue({ code: "custom", message: "json" });
          return z.NEVER;
        }
      }),
    productId: z.uuid(),
  }),
  async ({ input, supabase }) => {
    const { candidate, productId } = input;
    if (!(SOURCES as readonly string[]).includes(candidate.source)) {
      throw new ActionFailure("invalid");
    }
    const { data: product } = check(
      await supabase
        .from("products")
        .select("external_ids, details, images")
        .eq("id", productId)
        .single()
    );
    const details = (product?.details ?? {}) as Record<string, unknown>;
    const added = Object.fromEntries(
      Object.entries(candidate.details ?? {})
        .filter(([key, value]) => !details[key] && typeof value === "string")
        .map(([key, value]) => [key.slice(0, 60), value.slice(0, 200)])
    );
    const images = product?.images ?? [];
    const image =
      candidate.image && isRemoteCatalogImage(candidate.image)
        ? candidate.image
        : null;
    affected(
      await supabase
        .from("products")
        .update({
          details: { ...details, ...added } as NonNullable<Json>,
          external_ids: {
            ...((product?.external_ids ?? {}) as Record<string, unknown>),
            [candidate.source]: String(candidate.id).slice(0, 100),
          } as NonNullable<Json>,
          ...(image && images.length === 0
            ? { images: [image].slice(0, MAX_IMAGES) }
            : {}),
        })
        .eq("id", productId)
        .select("id")
    );

    if (candidate.barcode && BARCODE.test(candidate.barcode)) {
      const { data: variants } = check(
        await supabase
          .from("product_variants")
          .select("id, barcode")
          .eq("product_id", productId)
      );
      const [only] = variants ?? [];
      if (variants?.length === 1 && only && !only.barcode) {
        check(
          await supabase
            .from("product_variants")
            .update({ barcode: candidate.barcode })
            .eq("id", only.id)
        );
      }
    }
    return success();
  }
);

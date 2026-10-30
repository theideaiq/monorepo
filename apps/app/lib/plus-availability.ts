"use client";

import { useAuth } from "@repo/auth/provider";
import { useQueries } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Plus availability in words (`public.plus_availability(product)`): a copy
 * is on the shelf (`now`), every copy is out with no more people queued
 * than copies (`short`), more queued than copies (`long`), or no copy for
 * rent yet (`coming`); null when the product isn't in Plus.
 */
export type PlusAvailability = "coming" | "long" | "now" | "short";

const AVAILABILITY = new Set<string>(["coming", "long", "now", "short"]);

export const toAvailability = (value: unknown): PlusAvailability | null =>
  typeof value === "string" && AVAILABILITY.has(value)
    ? (value as PlusAvailability)
    : null;

/** Each product's availability, by id (missing until it loads). */
export const usePlusAvailability = (productIds: readonly string[]) => {
  const { supabase } = useAuth();
  const results = useQueries({
    queries: productIds.map((product) => ({
      queryFn: async () =>
        toAvailability(
          unwrap(await supabase.rpc("plus_availability", { product }))
        ),
      queryKey: ["plus-availability", product],
      staleTime: 60_000,
    })),
  });
  const byId = new Map<string, PlusAvailability | null>();
  productIds.forEach((id, index) => {
    const result = results[index];
    if (result?.isSuccess) {
      byId.set(id, result.data);
    }
  });
  return byId;
};

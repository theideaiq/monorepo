import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";

/** Average rating and number of published reviews of a product. */
export interface Rating {
  average: number;
  count: number;
}

/** A published review, as `product_review_list` returns it. */
export interface Review {
  /** The author's first name, or null when their profile has none. */
  author_name: string | null;
  comment: string | null;
  created_at: string;
  id: string;
  /** Paths in the public `reviews` bucket. */
  photos: string[];
  rating: number;
  verified_purchase: boolean;
}

export const BEST_RATING = 5;

/**
 * Ratings keyed by product id, from `product_ratings` rows. Rows without a
 * product, an average or any reviews are left out, so a product has a rating
 * only when it has been reviewed.
 */
export const ratingsById = (
  rows: {
    average: number | string | null;
    count: number | null;
    product_id: string | null;
  }[]
): Record<string, Rating> => {
  const ratings: Record<string, Rating> = {};
  for (const { average, count, product_id } of rows) {
    const value = Number(average);
    if (product_id && count && count > 0 && Number.isFinite(value)) {
      ratings[product_id] = { average: value, count };
    }
  }
  return ratings;
};

/** An average rating with one decimal, in Latin digits ("4.5", "4.0"). */
export const formatRating = (average: number, locale: Locale) =>
  formatNumber(average, locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

/** How much of each of the five stars is filled, from 0 to 1. */
export const starFills = (average: number) =>
  Array.from({ length: BEST_RATING }, (_, index) =>
    Math.min(Math.max(average - index, 0), 1)
  );

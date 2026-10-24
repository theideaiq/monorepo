import { Constants } from "@repo/database";
import { z } from "zod";
import { uuid } from "./forms";

export const reviewStatuses = Constants.public.Enums.review_status;

export const ratings = ["5", "4", "3", "2", "1"] as const;

export const reviewStatusSchema = z.object({
  id: uuid,
  status: z.enum(reviewStatuses),
});

export const reviewDeleteSchema = z.object({ id: uuid });

/** "★★★★☆" for a 1–5 rating (rounded), for compact lists. */
export const stars = (rating: number) => {
  const full = Math.min(5, Math.max(0, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
};

export interface RatingSummary {
  average: number | null;
  /** Published reviews per star rating, 5 down to 1. */
  byRating: { count: number; rating: number; share: number }[];
  hidden: number;
  published: number;
}

/**
 * A product's rating summary: the average and spread of its published
 * reviews (as the store shows them, see the `product_ratings` view), plus
 * how many are hidden.
 */
export const ratingSummary = (
  reviews: { rating: number; status: string }[]
): RatingSummary => {
  const published = reviews.filter((review) => review.status === "published");
  const total = published.reduce((sum, review) => sum + review.rating, 0);
  return {
    average:
      published.length > 0
        ? Math.round((total / published.length) * 10) / 10
        : null,
    byRating: [5, 4, 3, 2, 1].map((rating) => {
      const count = published.filter(
        (review) => review.rating === rating
      ).length;
      return {
        count,
        rating,
        share: published.length > 0 ? count / published.length : 0,
      };
    }),
    hidden: reviews.length - published.length,
    published: published.length,
  };
};

"use client";

import { useAuth } from "@repo/auth/provider";
import { uploadReviewPhoto } from "@repo/storage";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** Product reviews and ratings (published reviews are public). */

export const REVIEW_PAGE_SIZE = 10;
export const MAX_COMMENT_LENGTH = 2000;

export interface Rating {
  average: number;
  count: number;
}

/** product_ratings rows keyed by product id (products without reviews are absent). */
export const toRatingMap = (
  rows:
    | readonly {
        average: number | null;
        count: number | null;
        product_id: string | null;
      }[]
    | null
    | undefined
) => {
  const map = new Map<string, Rating>();
  for (const row of rows ?? []) {
    if (row.product_id && row.count) {
      map.set(row.product_id, {
        average: Number(row.average ?? 0),
        count: row.count,
      });
    }
  }
  return map;
};

/** Ratings of many products in one query (for a grid of cards). */
export const useProductRatings = (productIds: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: productIds.length > 0,
    queryFn: async () =>
      toRatingMap(
        unwrap(
          await supabase
            .from("product_ratings")
            .select("product_id, average, count")
            .in("product_id", [...productIds])
        )
      ),
    queryKey: queryKeys.productRatings(productIds),
    staleTime: 60_000,
  });
};

export interface ReviewRow {
  author_name: string | null;
  comment: string | null;
  created_at: string;
  id: string;
  photos: string[];
  rating: number;
  verified_purchase: boolean;
}

/** Photos a review can carry. */
export const MAX_REVIEW_PHOTOS = 4;

/** Published reviews, newest first, a page at a time. */
export const useProductReviews = (productId: string) => {
  const { supabase } = useAuth();
  return useInfiniteQuery({
    enabled: Boolean(productId),
    getNextPageParam: (lastPage: ReviewRow[], pages) =>
      lastPage.length < REVIEW_PAGE_SIZE
        ? undefined
        : pages.length * REVIEW_PAGE_SIZE,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) =>
      (unwrap(
        await supabase.rpc("product_review_list", {
          max_rows: REVIEW_PAGE_SIZE,
          review_product: productId,
          skip: pageParam,
        })
      ) ?? []) as ReviewRow[],
    queryKey: queryKeys.reviews(productId),
  });
};

/** The signed-in user's review of a product, hidden or not. */
export const useMyReview = (productId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && productId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("product_reviews")
          .select(
            "id, rating, comment, photos, status, verified_purchase, created_at"
          )
          .eq("product_id", productId)
          .eq("user_id", requireUserId(user?.id))
          .maybeSingle()
      ),
    queryKey: queryKeys.myReview(productId, user?.id ?? ""),
  });
};

/** Reviews (the list and the user's own) and ratings change together. */
const useRefreshReviews = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["reviews"] }),
      queryClient.invalidateQueries({ queryKey: ["product-ratings"] }),
    ]);
};

export interface ReviewDraft {
  comment: string;
  /** Uploaded photo paths (`useUploadReviewPhoto`). */
  photos: string[];
  rating: number;
}

/** Writes the user's review: inserts the first one, updates it afterwards. */
export const useSaveReview = (productId: string) => {
  const { supabase, user } = useAuth();
  const refresh = useRefreshReviews();
  return useMutation({
    mutationFn: async ({
      draft,
      reviewId,
    }: {
      draft: ReviewDraft;
      reviewId: string | null;
    }) => {
      const comment = draft.comment.trim() || null;
      if (reviewId) {
        unwrap(
          await supabase
            .from("product_reviews")
            .update({ comment, photos: draft.photos, rating: draft.rating })
            .eq("id", reviewId)
        );
        return;
      }
      unwrap(
        await supabase.from("product_reviews").insert({
          comment,
          photos: draft.photos,
          product_id: productId,
          rating: draft.rating,
          user_id: requireUserId(user?.id),
        })
      );
    },
    onSettled: refresh,
  });
};

/** Uploads one photo for the user's review and returns its path. */
export const useUploadReviewPhoto = () => {
  const { supabase, user } = useAuth();
  return useMutation({
    mutationFn: async (file: File) =>
      (await uploadReviewPhoto(supabase, requireUserId(user?.id), file)).path,
  });
};

export const useDeleteReview = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshReviews();
  return useMutation({
    mutationFn: async (reviewId: string) => {
      unwrap(
        await supabase.from("product_reviews").delete().eq("id", reviewId)
      );
    },
    onSettled: refresh,
  });
};

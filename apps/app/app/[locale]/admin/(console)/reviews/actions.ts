"use server";

import { affected, staffAction } from "@/lib/admin/action";
import { success } from "@/lib/admin/action-state";
import { reviewDeleteSchema, reviewStatusSchema } from "@/lib/admin/reviews";

/** Hides a review from the store, or publishes it again. */
export const setReviewStatus = staffAction(
  "reviews",
  reviewStatusSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("product_reviews")
        .update({ status: input.status })
        .eq("id", input.id)
        .select("id")
    );
    return success();
  }
);

export const deleteReview = staffAction(
  "reviews",
  reviewDeleteSchema,
  async ({ input, supabase }) => {
    affected(
      await supabase
        .from("product_reviews")
        .delete()
        .eq("id", input.id)
        .select("id")
    );
    return success("deleted");
  }
);

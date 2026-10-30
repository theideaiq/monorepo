"use client";

import { useAuth } from "@repo/auth/provider";
import { PRODUCT_CARD_COLUMNS, type ProductCard } from "@repo/commerce/catalog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePlusPlanState } from "./plus-launch";
import { requireUserId, unwrap } from "./queries";

/**
 * The Plus queue (`rental_queue_items`): what a Plus member rents next, in
 * order. Swaps take from the top. It is separate from Saved.
 */

export interface QueueItem {
  /** The kid's profile it was queued for (Family). */
  for_profile?: string | null;
  /** The linked teen it was approved for (Family). */
  for_user?: string | null;
  position: number;
  product: (ProductCard & { status: string }) | null;
  product_id: string;
}

const queueKey = (userId: string) => ["rental-queue", userId] as const;

const QUEUE_COLUMNS = `product_id, position, for_profile, for_user, product:products (${PRODUCT_CARD_COLUMNS}, status)`;

/** The member's queue, in order, without items that can't be rented now. */
export const useQueue = () => {
  const { supabase, user } = useAuth();
  const query = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("rental_queue_items")
          .select(QUEUE_COLUMNS)
          .eq("user_id", requireUserId(user?.id))
          .order("position")
      ) as unknown as QueueItem[],
    queryKey: queueKey(user?.id ?? ""),
  });
  return {
    ...query,
    items: (query.data ?? []).filter(
      (item) => item.product?.rentable && item.product.status === "active"
    ),
  };
};

/** Whether the member has Plus (and so a queue). */
export const useHasPlus = () => Boolean(usePlusPlanState().data);

export const useIsQueued = (productId: string) =>
  useQueue().data?.some((item) => item.product_id === productId) ?? false;

const useQueueMutation = <Input>(
  run: (
    supabase: ReturnType<typeof useAuth>["supabase"],
    input: Input,
    userId: string
  ) => PromiseLike<{ data: unknown; error: unknown }>
) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Input) =>
      unwrap(await run(supabase, input, requireUserId(user?.id))),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: queueKey(user?.id ?? "") }),
  });
};

/** Adds a rentable product to the end of the queue. */
export const useAddToQueue = () =>
  useQueueMutation((supabase, productId: string) =>
    supabase.rpc("queue_add", { product: productId })
  );

export const useRemoveFromQueue = () =>
  useQueueMutation((supabase, productId: string, userId) =>
    supabase
      .from("rental_queue_items")
      .delete()
      .eq("user_id", userId)
      .eq("product_id", productId)
  );

/** Puts the queue in this order (product ids, first is next). */
export const useReorderQueue = () =>
  useQueueMutation((supabase, productIds: string[]) =>
    supabase.rpc("reorder_queue", { products: productIds })
  );

"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { uploadReturnPhoto } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * Returns on The IDEA Pass: asking to return a delivered line (with
 * photos in the private return-photos bucket), following it and
 * withdrawing it before it's collected.
 */

export type ReturnReason = Database["public"]["Enums"]["return_reason"];
export type ReturnStatus = Database["public"]["Enums"]["return_status"];

export const RETURN_REASONS = [
  "wrong_item",
  "faulty",
  "not_as_described",
  "changed_mind",
  "never_arrived",
] as const satisfies readonly ReturnReason[];

/** The most photos a return takes. */
export const MAX_RETURN_PHOTOS = 6;

/** Returns that still count against the line's quantity. */
const OPEN_STATUSES = new Set<ReturnStatus>([
  "requested",
  "disputed",
  "approved",
  "collecting",
  "received",
  "refund_due",
  "refunded",
]);

const returnsKey = (orderId: string) => ["returns", orderId] as const;

/** An order's returns; only fetched once the order is delivered. */
export const useOrderReturns = (orderId: string, delivered: boolean) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && orderId && delivered),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("returns")
          .select(
            "id, number, order_item_id, quantity, reason, status, refund_amount, refund_bulbs, collection_fee, staff_note, created_at"
          )
          .eq("order_id", orderId)
          .order("created_at")
      ) ?? [],
    queryKey: returnsKey(orderId),
  });
};

export type OrderReturn = NonNullable<
  ReturnType<typeof useOrderReturns>["data"]
>[number];

/** How many of a line are already being returned (or were). */
export const returnedQuantity = (
  returns: readonly Pick<
    OrderReturn,
    "order_item_id" | "quantity" | "status"
  >[],
  lineId: string
) =>
  returns
    .filter(
      (item) => item.order_item_id === lineId && OPEN_STATUSES.has(item.status)
    )
    .reduce((sum, item) => sum + item.quantity, 0);

/** Photos are needed for every reason but a parcel that never arrived. */
export const needsPhotos = (reason: ReturnReason) => reason !== "never_arrived";

export interface ReturnRequest {
  details: string;
  line: string;
  orderId: string;
  photos: readonly File[];
  quantity: number;
  reason: ReturnReason;
  unopened: boolean;
}

export const useRequestReturn = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: ReturnRequest) => {
      const userId = requireUserId(user?.id);
      const stored = await Promise.all(
        request.photos.map((photo) =>
          uploadReturnPhoto(supabase, userId, photo)
        )
      );
      return unwrap(
        await supabase.rpc("request_return", {
          details: request.details,
          line: request.line,
          photos: stored.map((photo) => photo.path),
          quantity: request.quantity,
          reason: request.reason,
          unopened: request.unopened,
        })
      );
    },
    onSuccess: (_data, request) =>
      queryClient.invalidateQueries({ queryKey: returnsKey(request.orderId) }),
  });
};

export const useCancelReturn = (orderId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("cancel_return", { target })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: returnsKey(orderId) }),
  });
};

"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/** IDEA Plus: rental allowance, rentals and requests. */

export interface RentalAllowance {
  /** Slots of the live Plus plan (0 without a membership). */
  slots: number;
  /** Rentals requested, with the member or overdue. */
  used: number;
  free: number;
}

/** my_rental_allowance() as numbers the UI can use directly. */
export const toAllowance = (
  rows: readonly { in_use: number; slots: number }[] | null | undefined
): RentalAllowance => {
  const slots = rows?.[0]?.slots ?? 0;
  const used = rows?.[0]?.in_use ?? 0;
  return { free: Math.max(slots - used, 0), slots, used };
};

export const useRentalAllowance = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      toAllowance(unwrap(await supabase.rpc("my_rental_allowance"))),
    queryKey: queryKeys.rentalAllowance(user?.id ?? ""),
  });
};

export const useRentals = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("rentals")
          .select(
            "id, product_id, name_ar, name_en, status, requested_at, started_at, due_at, returned_at"
          )
          .eq("user_id", requireUserId(user?.id))
          .order("requested_at", { ascending: false })
          .limit(50)
      ),
    queryKey: queryKeys.rentals(user?.id ?? ""),
  });
};

const useRefreshRentals = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.rentals(userId) }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.rentalAllowance(userId),
      }),
      // Stock counts change with every request and cancellation.
      queryClient.invalidateQueries({ queryKey: ["products"] }),
    ]);
};

export const useRequestRental = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshRentals();
  return useMutation({
    mutationFn: async (productId: string) =>
      unwrap(
        await supabase.rpc("request_rental", { rental_product: productId })
      ),
    onSettled: refresh,
  });
};

export const useCancelRental = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshRentals();
  return useMutation({
    mutationFn: async (rentalId: string) =>
      unwrap(await supabase.rpc("cancel_rental", { rental: rentalId })),
    onSettled: refresh,
  });
};

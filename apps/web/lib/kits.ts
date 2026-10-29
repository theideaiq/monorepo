"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Game night kits (migration `20261223000000_game_night_kits.sql`): a
 * console set for the weekend, Thursday evening to Saturday evening,
 * delivered and collected in Baghdad.
 */

/** Extra days a kit can stay after Saturday. */
export const MAX_EXTRA_DAYS = 3;

export const useKitType = (kit: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("kit_types")
          .select(
            "id, name_ar, name_en, description_ar, description_en, price, extra_day_price, deposit, games"
          )
          .eq("id", kit)
          .maybeSingle()
      ) ?? null,
    queryKey: ["kits", "type", kit],
  });
};

/** The coming weekends with kits free, priced for the caller. */
export const useKitWeekends = (kit: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(kit),
    queryFn: async () =>
      (unwrap(await supabase.rpc("kit_weekends", { kit })) ?? []).map(
        (row) => ({
          extraDayPrice: row.extra_day_price,
          price: row.price,
          startsOn: row.starts_on,
          unitsFree: row.units_free,
        })
      ),
    queryKey: ["kits", "weekends", kit, user?.id ?? ""],
  });
};

/** The member's kit bookings, newest first. */
export const useMyKitBookings = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("kit_bookings")
          .select(
            "id, kit_type, starts_on, ends_on, status, order_id, deposit, refund_due"
          )
          .order("starts_on", { ascending: false })
          .limit(20)
      ) ?? [],
    queryKey: ["kits", "mine", user?.id ?? ""],
  });
};

/** The total for a weekend and its extra days. */
export const kitTotal = (
  weekend: { extraDayPrice: number; price: number } | undefined,
  extraDays: number
) => (weekend ? weekend.price + extraDays * weekend.extraDayPrice : 0);

/** The kit booking waiting in the member's cart (`cart_kits`), if any. */
export interface CartKit {
  extra_days: number;
  games: string[];
  id: string;
  kit: { name_ar: string; name_en: string; deposit: number } | null;
  kit_type: string;
  starts_on: string;
}

const cartKitKey = (userId: string) => [...queryKeys.cart(userId), "kit"];

export const useCartKit = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase
          .from("cart_kits")
          .select(
            "id, kit_type, starts_on, extra_days, games, kit:kit_types (name_ar, name_en, deposit)"
          )
          .maybeSingle()
      ) as CartKit | null) ?? null,
    queryKey: cartKitKey(user?.id ?? ""),
  });
};

/**
 * Puts a kit booking in the cart, replacing the one there (a cart holds
 * one); the database checks it like `book_kit()`.
 */
export const useAddKitToCart = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (booking: {
      extraDays: number;
      games: string[];
      kit: string;
      startsOn: string;
    }) => {
      const userId = requireUserId(user?.id);
      unwrap(await supabase.from("cart_kits").delete().eq("user_id", userId));
      unwrap(
        await supabase.from("cart_kits").insert({
          extra_days: booking.extraDays,
          games: booking.games,
          kit_type: booking.kit,
          starts_on: booking.startsOn,
        })
      );
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

export const useRemoveCartKit = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      unwrap(await supabase.from("cart_kits").delete().eq("id", id));
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.cart(user?.id ?? ""),
      }),
  });
};

/**
 * The cart's kit priced for the cart page and checkout summary: its
 * weekend's price and extra days, and the deposit (none for students).
 */
export const useCartKitLine = (isStudent: boolean) => {
  const kit = useCartKit().data ?? null;
  const weekends = useKitWeekends(kit?.kit_type ?? "");
  if (!kit) {
    return null;
  }
  const weekend = weekends.data?.find((row) => row.startsOn === kit.starts_on);
  return {
    available: Boolean(weekend && weekend.unitsFree > 0),
    deposit: isStudent ? 0 : (kit.kit?.deposit ?? 0),
    item: kit,
    price: kitTotal(weekend, kit.extra_days),
  };
};

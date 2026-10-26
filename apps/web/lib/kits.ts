"use client";

import { useAuth } from "@repo/auth/provider";
import { useQuery } from "@tanstack/react-query";
import { unwrap } from "./queries";

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

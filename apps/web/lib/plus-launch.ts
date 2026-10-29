"use client";

import { useAuth } from "@repo/auth/provider";
import type { PaymentMethod } from "@repo/commerce";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, unwrap } from "./queries";

/**
 * The IDEA Plus launch (migration `20261222000000_plus_launch.sql`): a set
 * number of places with a waitlist, homes in Baghdad, swaps, and pausing,
 * cancelling or changing the plan.
 */

/** Why the caller can or can't start paying for Plus now. */
export type JoinReason =
  | "full"
  | "invited"
  | "member"
  | "needs_home"
  | "open"
  | "outside_baghdad"
  | "signed_out";

export interface PlusStatus {
  canJoin: boolean;
  capacity: number;
  inviteExpiresAt: string | null;
  joinReason: JoinReason;
  placesFree: number;
  waiting: number;
  waitlistGovernorate: string | null;
  waitlistPosition: number | null;
  waitlistStatus: string | null;
}

const PLUS = ["plus-launch"] as const;

/** Places, the caller's waitlist place and whether they can join. */
export const usePlusStatus = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    queryFn: async (): Promise<PlusStatus | null> => {
      const row = unwrap(await supabase.rpc("plus_status").maybeSingle());
      return row
        ? {
            canJoin: row.can_join,
            capacity: row.capacity,
            inviteExpiresAt: row.invite_expires_at,
            joinReason: row.join_reason as JoinReason,
            placesFree: row.places_free,
            waiting: row.waiting,
            waitlistGovernorate: row.waitlist_governorate,
            waitlistPosition: row.waitlist_position,
            waitlistStatus: row.waitlist_status,
          }
        : null;
    },
    queryKey: [...PLUS, "status", user?.id ?? ""],
  });
};

/** The parts of Baghdad Plus delivers to, with their delivery day. */
export const usePlusAreas = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plus_areas")
          .select("id, name_ar, name_en, weekday")
          .eq("active", true)
          .order("position")
      ) ?? [],
    queryKey: [...PLUS, "areas"],
    staleTime: 60 * 60_000,
  });
};

/** The member's area and address for swaps. */
export const usePlusHome = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plus_homes")
          .select("area_id, address, phone")
          .maybeSingle()
      ) ?? null,
    queryKey: [...PLUS, "home", user?.id ?? ""],
  });
};

/** The member's open swap, if any, and what goes and comes with it. */
export const useOpenSwap = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plus_swaps")
          .select(
            "id, method, status, scheduled_for, fee, order_id, created_at"
          )
          .eq("status", "booked")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ) ?? null,
    queryKey: [...PLUS, "swap", user?.id ?? ""],
  });
};

/** Home swaps left this month, the extra-swap fee and the next date. */
export const useSwapTerms = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const row = unwrap(await supabase.rpc("my_swap_terms").maybeSingle());
      return row
        ? {
            extraFee: row.extra_fee,
            homeSwaps: row.home_swaps,
            nextDate: row.next_date,
            used: row.home_swaps_used,
          }
        : null;
    },
    queryKey: [...PLUS, "terms", user?.id ?? ""],
  });
};

/** Pause days left in the last 12 months, and the subscription's state. */
export const usePlusPlanState = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("subscriptions")
          .select(
            "id, plan_id, next_plan_id, paused_until, cancel_at_period_end, current_period_end, provider, renewal_bulbs"
          )
          .eq("user_id", user?.id ?? "")
          .in("status", ["active", "past_due"])
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      ) ?? null,
    queryKey: [...PLUS, "plan", user?.id ?? ""],
  });
};

/** Every Plus action, each refreshing what it changes. */
export const usePlusActions = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: PLUS }),
      queryClient.invalidateQueries({ queryKey: ["rentals"] }),
      queryClient.invalidateQueries({ queryKey: ["rental-allowance"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.plusSubscription(user?.id ?? ""),
      }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    ]);

  return {
    bookSwap: useMutation({
      mutationFn: async ({
        method,
        paymentMethod = "online",
        returns,
        wants,
      }: {
        method: "home";
        paymentMethod?: PaymentMethod;
        returns: string[];
        wants: string[];
      }) =>
        unwrap(
          await supabase.rpc("book_swap", {
            method,
            payment_method: paymentMethod,
            returns,
            wants,
          })
        ),
      onSettled: refresh,
    }),
    cancel: useMutation({
      mutationFn: async (keep: boolean) =>
        unwrap(await supabase.rpc("cancel_plus", { keep })),
      onSettled: refresh,
    }),
    cancelSwap: useMutation({
      mutationFn: async (swapId: string) =>
        unwrap(await supabase.rpc("cancel_swap", { target: swapId })),
      onSettled: refresh,
    }),
    changePlan: useMutation({
      mutationFn: async (planId: string) =>
        unwrap(await supabase.rpc("change_plus_plan", { plan: planId })),
      onSettled: refresh,
    }),
    joinWaitlist: useMutation({
      mutationFn: async ({
        governorate,
        planId,
      }: {
        governorate: string;
        planId: string | null;
      }) =>
        unwrap(
          await supabase.rpc("join_plus_waitlist", {
            governorate,
            plan: planId ?? "",
          })
        ),
      onSettled: refresh,
    }),
    leaveWaitlist: useMutation({
      mutationFn: async () => unwrap(await supabase.rpc("leave_plus_waitlist")),
      onSettled: refresh,
    }),
    pause: useMutation({
      mutationFn: async (days: number) =>
        unwrap(await supabase.rpc("pause_plus", { days })),
      onSettled: refresh,
    }),
    resume: useMutation({
      mutationFn: async () => unwrap(await supabase.rpc("resume_plus")),
      onSettled: refresh,
    }),
    setHome: useMutation({
      mutationFn: async ({
        address,
        areaId,
        phone,
      }: {
        address: string;
        areaId: string;
        phone: string;
      }) =>
        unwrap(
          await supabase.rpc("set_plus_home", {
            address,
            area: areaId,
            phone,
          })
        ),
      onSettled: refresh,
    }),
    /** Bulbs for the next renewal (steps of 250, up to half its price). */
    setRenewalBulbs: useMutation({
      mutationFn: async (amount: number) =>
        unwrap(await supabase.rpc("set_renewal_bulbs", { amount })),
      onSettled: () =>
        Promise.all([
          refresh(),
          queryClient.invalidateQueries({
            queryKey: queryKeys.bulbs(user?.id ?? ""),
          }),
        ]),
    }),
  };
};

/** The days of the week, Sunday first, as message keys. */
export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** The Plus plans for one billing period, cheapest first. */
export const plansFor = <Plan extends { billing_interval: string }>(
  plans: readonly Plan[] | undefined,
  interval: "month" | "year"
) => (plans ?? []).filter((plan) => plan.billing_interval === interval);

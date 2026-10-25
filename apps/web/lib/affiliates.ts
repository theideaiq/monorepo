"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Affiliates: theideaiq.com/a/<code> (or the same code typed at checkout)
 * gives the member 5% off their orders for 30 days and earns the affiliate a
 * commission. A link followed before signing in waits on the device until
 * then (`AffiliateToucher`); `touch_affiliate` records it.
 */

export type AffiliateStatus = Database["public"]["Enums"]["affiliate_status"];
export type PayoutMethod =
  Database["public"]["Enums"]["affiliate_payout_method"];
export type Commission =
  Database["public"]["Tables"]["affiliate_commissions"]["Row"];
export type Payout = Database["public"]["Tables"]["affiliate_payouts"]["Row"];

export const payoutMethods = [
  "bulbs",
  "zaincash",
  "fib",
  "qi",
  "bank",
] as const satisfies readonly PayoutMethod[];

/** The smallest payout, in IQD (`record_affiliate_payout`). */
export const AFFILIATE_MIN_PAYOUT = 25_000;

const STORAGE_KEY = "idea-affiliate";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE = /^[A-Z0-9]{4,20}$/;

/** A code as stored: upper case, or null when it can't be one. */
export const normalizeAffiliateCode = (code: string) => {
  const clean = code.trim().toUpperCase();
  return CODE.test(clean) ? clean : null;
};

/** Keeps an affiliate link's code for 30 days. */
export const rememberAffiliate = (code: string) => {
  const clean = normalizeAffiliateCode(code);
  if (!clean) {
    return;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: clean, savedAt: Date.now() })
    );
  } catch {
    // Storage blocked: the link counts only if followed while signed in.
  }
};

/** The remembered code, unless it's older than 30 days. */
export const storedAffiliate = (): string | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const { code, savedAt } = JSON.parse(raw) as {
      code?: string;
      savedAt?: number;
    };
    if (!(code && savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return code;
  } catch {
    return null;
  }
};

const forgetAffiliate = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
};

/**
 * Records an affiliate's link or code for the signed-in member; returns the
 * code and the affiliate's first name. A remembered link is forgotten once
 * tried.
 */
export const useTouchAffiliate = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      code,
      via,
    }: {
      code: string;
      via: "code" | "link";
    }) => {
      try {
        const rows = unwrap(
          await supabase.rpc("touch_affiliate", {
            affiliate_code: code,
            via,
          })
        );
        return rows?.[0] ?? null;
      } finally {
        if (via === "link") {
          forgetAffiliate();
        }
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.affiliateReferrer(user?.id ?? ""),
      }),
  });
};

/** The affiliate the member's next order counts for (5% off), if any. */
export const useAffiliateReferrer = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.rpc("my_affiliate_referrer"))?.[0] ?? null,
    queryKey: queryKeys.affiliateReferrer(user?.id ?? ""),
  });
};

/** The member's affiliate status, balance, commissions and payouts. */
export const useMyAffiliate = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const userId = requireUserId(user?.id);
      const [summary, application, commissions, payouts] = await Promise.all([
        supabase.rpc("my_affiliate"),
        supabase
          .from("affiliates")
          .select("pitch, channel, staff_note")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("affiliate_commissions")
          .select("*")
          .eq("affiliate_id", userId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("affiliate_id", userId)
          .order("created_at", { ascending: false })
          .limit(24),
      ]);
      const row = unwrap(summary)?.[0];
      if (!row) {
        return null;
      }
      return {
        ...row,
        application: unwrap(application),
        commissions: unwrap(commissions) ?? [],
        payouts: unwrap(payouts) ?? [],
      };
    },
    queryKey: queryKeys.affiliate(user?.id ?? ""),
  });
};

const useRefreshAffiliate = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.affiliate(user?.id ?? ""),
    });
};

/** Applies (again, after a rejection) to be an affiliate. */
export const useApplyAffiliate = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshAffiliate();
  return useMutation({
    mutationFn: async ({
      channel,
      pitch,
    }: {
      channel: string;
      pitch: string;
    }) => unwrap(await supabase.rpc("apply_affiliate", { channel, pitch })),
    onSuccess: refresh,
  });
};

/** Sets how the affiliate is paid. */
export const useSetPayout = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshAffiliate();
  return useMutation({
    mutationFn: async ({
      account,
      method,
    }: {
      account: string;
      method: PayoutMethod;
    }) =>
      unwrap(await supabase.rpc("set_affiliate_payout", { account, method })),
    onSuccess: refresh,
  });
};

/** Where a commission stands: in the return window, ready, paid or void. */
export const commissionState = (commission: Commission, now = new Date()) => {
  if (commission.status !== "pending") {
    return commission.status;
  }
  return new Date(commission.available_at) > now ? "holding" : "ready";
};

"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, requireUserId, unwrap } from "./queries";

/**
 * Invite friends: theideaiq.com/i/<code> remembers the code on the device
 * until the visitor is signed in, then `claim_invite` records who invited
 * them (new members only). Their first order gets 10% off (at most 15,000
 * IQD); the inviter earns 50 Bulbs once it's delivered.
 */

const STORAGE_KEY = "idea-invite";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const CODE = /^[a-z0-9]{6,16}$/;

/** Keeps an invite code for 30 days. */
export const rememberInvite = (code: string) => {
  const clean = code.trim().toLowerCase();
  if (!CODE.test(clean)) {
    return;
  }
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ code: clean, savedAt: Date.now() })
    );
  } catch {
    // Storage blocked: the invite works only if claimed right away.
  }
};

/** The remembered code, unless it's older than 30 days. */
export const storedInvite = (): string | null => {
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

export const forgetInvite = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
};

/**
 * Claims a code for the signed-in member. A code that can't be used (their
 * own, unknown, or they've ordered before) is forgotten all the same.
 */
export const useClaimInvite = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (code: string) => {
      try {
        return unwrap(await supabase.rpc("claim_invite", { code }));
      } finally {
        forgetInvite();
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.referral(user?.id ?? ""),
      }),
  });
};

/** The member's invite code and how their invites are doing. */
export const useMyInvites = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_invites"))?.[0] ?? null,
    queryKey: queryKeys.invites(user?.id ?? ""),
  });
};

/**
 * Whether the member's next order gets the invite discount: invited and
 * not yet rewarded or used (`create_order()` decides for sure).
 */
export const useInviteDiscount = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const userId = requireUserId(user?.id);
      const [referral, orders] = await Promise.all([
        supabase
          .from("referrals")
          .select("status")
          .eq("invitee_id", userId)
          .maybeSingle(),
        supabase
          .from("orders")
          .select("status, discount_source")
          .eq("user_id", userId)
          .neq("status", "cancelled"),
      ]);
      if (unwrap(referral)?.status !== "pending") {
        return false;
      }
      return !(unwrap(orders) ?? []).some(
        (order) =>
          order.status !== "pending" || order.discount_source === "invite"
      );
    },
    queryKey: queryKeys.referral(user?.id ?? ""),
  });
};

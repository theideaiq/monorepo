"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, unwrap } from "./queries";

/**
 * Plus Duo (migration `20270314000000_plus_duo.sql`): the holder invites
 * one more Pass, who shares the rental slots and home swaps and has the
 * plan's benefits on their own.
 */

export type DuoRole = "holder" | "partner";
export type DuoPartnerStatus =
  | "ending"
  | "expired"
  | "guardian"
  | "invited"
  | "joined";
export type DuoSwapOrder = "alternate" | "holder" | "partner";

export interface MyDuo {
  endsAt: string | null;
  hasHome: boolean;
  holderName: string | null;
  inviteExpiresAt: string | null;
  inviteToken: string | null;
  joinedAt: string | null;
  partnerName: string | null;
  partnerStatus: DuoPartnerStatus | null;
  planId: string;
  role: DuoRole;
  swapDate: string | null;
  swapOrder: DuoSwapOrder;
}

type Row = Record<string, unknown>;

const text = (row: Row, key: string) => {
  const value = row[key];
  return typeof value === "string" ? value : null;
};

/** `my_duo()`'s JSON as a typed object, or null off a Duo. */
export const toMyDuo = (value: unknown): MyDuo | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const row = value as Row;
  return {
    endsAt: text(row, "ends_at"),
    hasHome: row.has_home === true,
    holderName: text(row, "holder_name"),
    inviteExpiresAt: text(row, "invite_expires_at"),
    inviteToken: text(row, "invite_token"),
    joinedAt: text(row, "joined_at"),
    partnerName: text(row, "partner_name"),
    partnerStatus: text(row, "partner_status") as DuoPartnerStatus | null,
    planId: text(row, "plan_id") ?? "",
    role: row.role === "partner" ? "partner" : "holder",
    swapDate: text(row, "swap_date"),
    swapOrder: (text(row, "swap_order") ?? "alternate") as DuoSwapOrder,
  };
};

/** Whether the Duo's two people share swaps now (a partner has joined). */
export const sharesSwaps = (duo: MyDuo | null | undefined) =>
  duo?.partnerStatus === "joined" || duo?.partnerStatus === "ending";

/** Whether the caller has Plus through someone else's Duo. */
export const isDuoPartner = (duo: MyDuo | null | undefined) =>
  duo?.role === "partner" && sharesSwaps(duo);

const DUO = ["plus-duo"] as const;

/** The caller's Duo, as holder or partner. */
export const useMyDuo = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => toMyDuo(unwrap(await supabase.rpc("my_duo"))),
    queryKey: [...DUO, "mine", user?.id ?? ""],
  });
};

/** Both queues, in the order the next swap picks from. */
export const useHouseholdQueue = (enabled: boolean) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user) && enabled,
    queryFn: async () => unwrap(await supabase.rpc("household_queue")) ?? [],
    queryKey: [...DUO, "queue", user?.id ?? ""],
  });
};

/** What an invite shows before it's accepted. */
export const useDuoInvite = (token: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user) && token.length > 0,
    queryFn: async () =>
      unwrap(await supabase.rpc("duo_invite", { token }).maybeSingle()) ?? null,
    queryKey: [...DUO, "invite", token, user?.id ?? ""],
  });
};

/** A 13–17-year-old's Duo places waiting for the caller's approval. */
export const useDuoApprovals = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("duo_approvals")) ?? [],
    queryKey: [...DUO, "approvals", user?.id ?? ""],
  });
};

/** Every Duo action, each refreshing Plus and the Duo. */
export const useDuoActions = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: DUO }),
      queryClient.invalidateQueries({ queryKey: ["plus-launch"] }),
      queryClient.invalidateQueries({ queryKey: ["rentals"] }),
      queryClient.invalidateQueries({ queryKey: ["rental-allowance"] }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.plusSubscription(user?.id ?? ""),
      }),
    ]);

  return {
    accept: useMutation({
      mutationFn: async (token: string) =>
        unwrap(await supabase.rpc("accept_duo_invite", { token })),
      onSettled: refresh,
    }),
    decide: useMutation({
      mutationFn: async ({
        approve,
        place,
      }: {
        approve: boolean;
        place: string;
      }) =>
        unwrap(await supabase.rpc("decide_duo_guardian", { approve, place })),
      onSettled: refresh,
    }),
    invite: useMutation({
      mutationFn: async () => unwrap(await supabase.rpc("invite_duo_partner")),
      onSettled: refresh,
    }),
    leave: useMutation({
      mutationFn: async () => unwrap(await supabase.rpc("leave_duo")),
      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: async (keep: boolean) =>
        unwrap(await supabase.rpc("remove_duo_partner", { keep })),
      onSettled: refresh,
    }),
    setSwapOrder: useMutation({
      mutationFn: async (order: DuoSwapOrder) =>
        unwrap(await supabase.rpc("set_duo_swap_order", { swap_order: order })),
      onSettled: refresh,
    }),
  };
};

export type DuoError =
  | "alreadyDuo"
  | "alreadyPlus"
  | "expired"
  | "failed"
  | "full"
  | "needsGuardian"
  | "ownInvite"
  | "rentalsOut"
  | "tooYoung";

/** Why a Duo action was refused, as a message key. */
export const duoErrorKey = (error: Error | null): DuoError => {
  const message = error?.message ?? "";
  const known: [string, DuoError][] = [
    ["already has a second person", "full"],
    ["already have Plus", "alreadyPlus"],
    ["already on a Duo", "alreadyDuo"],
    ["has expired", "expired"],
    ["guardian's Pass", "needsGuardian"],
    ["13 and over", "tooYoung"],
    ["second person", "ownInvite"],
    ["rentals must be returned", "rentalsOut"],
  ];
  return known.find(([key]) => message.includes(key))?.[1] ?? "failed";
};

/** The Family invite link the holder shares (a Duo place). */
export const duoInvitePath = (token: string) =>
  `/family/${encodeURIComponent(token)}`;

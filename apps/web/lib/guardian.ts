"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Guardians for 13–17-year-olds (the ages migration): the teen invites a
 * guardian with a code, an adult signed in with The IDEA Pass accepts it, and the guardian
 * approves the teen's orders and The IDEA Plus.
 */

export interface PendingOrder {
  created_at: string;
  id: string;
  items: number;
  number: number;
  total: number;
}

const GUARDIAN = ["guardian"] as const;

/** The caller's age group and guardian link (my_guardian()). */
export const useMyGuardian = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.rpc("my_guardian").maybeSingle()) ?? null,
    queryKey: [...GUARDIAN, "mine", user?.id ?? ""],
  });
};

/** The teens the caller is guardian of, with orders waiting (my_teens()). */
export const useMyTeens = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.rpc("my_teens")) ?? []).map((teen) => ({
        ...teen,
        pending_orders: (teen.pending_orders ??
          []) as unknown as PendingOrder[],
      })),
    queryKey: [...GUARDIAN, "teens", user?.id ?? ""],
  });
};

/** Whose invite a code is, before accepting it. */
export const useGuardianInvite = (code: string | null) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && code),
    queryFn: async () =>
      unwrap(
        await supabase
          .rpc("guardian_invite", { invite_code: code ?? "" })
          .maybeSingle()
      ) ?? null,
    queryKey: [...GUARDIAN, "invite", code ?? ""],
  });
};

/** The guardian actions; each refreshes the guardian queries. */
export const useGuardianActions = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const onSuccess = () => queryClient.invalidateQueries({ queryKey: GUARDIAN });

  return {
    accept: useMutation({
      mutationFn: async (code: string) =>
        unwrap(await supabase.rpc("accept_guardian", { invite_code: code })),
      onSuccess,
    }),
    allowPlus: useMutation({
      mutationFn: async ({ allow, link }: { allow: boolean; link: string }) =>
        unwrap(await supabase.rpc("set_guardian_plus", { allow, link })),
      onSuccess,
    }),
    decide: useMutation({
      mutationFn: async ({
        approve,
        order,
      }: {
        approve: boolean;
        order: string;
      }) =>
        unwrap(
          await supabase.rpc("decide_guardian_order", {
            approve,
            target: order,
          })
        ),
      onSuccess,
    }),
    invite: useMutation({
      mutationFn: async () => unwrap(await supabase.rpc("invite_guardian")),
      onSuccess,
    }),
    revoke: useMutation({
      mutationFn: async (link: string) =>
        unwrap(await supabase.rpc("revoke_guardian", { link })),
      onSuccess,
    }),
  };
};

/** The link a teen sends their guardian. */
export const guardianInviteUrl = (origin: string, code: string) =>
  `${origin}/pass/settings?guardian=${encodeURIComponent(code)}#guardian`;

"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partner perks from the partner's side: the organizations the signed-in
 * person checks cards for, checking a card, recording a use and the
 * monthly counts.
 */

export const useMyPartners = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_partners")) ?? [],
    queryKey: ["my-partners", user?.id ?? ""],
  });
};

export interface CheckedPerk {
  audience: "everyone" | "plus" | "students";
  id: string;
  open: boolean;
  title_ar: string;
  title_en: string;
  used_today: boolean;
}

export interface CheckedCard {
  first_name?: string;
  member_number?: number;
  perks?: CheckedPerk[];
  plus?: boolean;
  student?: boolean;
  valid: boolean;
}

export const usePartnerCheck = (organizationId: string) => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (scanned: string) =>
      unwrap(
        await supabase.rpc("partner_check", {
          org: organizationId,
          scanned,
        })
      ) as unknown as CheckedCard,
  });
};

export const useRedeemPerk = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ perk, scanned }: { perk: string; scanned: string }) =>
      unwrap(await supabase.rpc("redeem_perk", { perk, scanned })),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["perk-stats", organizationId],
      }),
  });
};

export const usePerkStats = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [stats, perks] = await Promise.all([
        supabase.rpc("perk_stats", { org: organizationId }),
        supabase
          .from("perks")
          .select("id, title_ar, title_en, audience, active")
          .eq("organization_id", organizationId)
          .order("position"),
      ]);
      return { perks: unwrap(perks) ?? [], stats: unwrap(stats) ?? [] };
    },
    queryKey: ["perk-stats", organizationId],
  });
};

/** What a failed redemption means, as a message key. */
export const redeemError = (message: string | undefined) => {
  if (message?.includes("Already used today")) {
    return "usedToday" as const;
  }
  if (message?.includes("isn't open")) {
    return "notOpen" as const;
  }
  if (message?.includes("isn't valid")) {
    return "invalidCard" as const;
  }
  return "failed" as const;
};

/** University names, for a student check's result. */
export const useUniversityNames = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.from("universities").select("id, name_ar, name_en")
      ),
    queryKey: ["universities", "names"],
    staleTime: 60 * 60 * 1000,
  });
};

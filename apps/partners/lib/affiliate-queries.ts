"use client";

import { useAuth } from "@repo/auth/provider";
import type { Database } from "@repo/database";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * Partners → Affiliate: the organization applies, and once The IDEA
 * approves it shares its code (5% off a follower's order) or its link,
 * theideaiq.com/a/<code>. Commission is earned per category on delivered
 * orders, payable after the return window, and paid monthly from 25,000
 * IQD to the payout details given here.
 */

type Tables = Database["public"]["Tables"];
export type Affiliate = Tables["affiliates"]["Row"];
export type AffiliateCommission = Tables["affiliate_commissions"]["Row"];
export type AffiliatePayout = Tables["affiliate_payouts"]["Row"];
export type AffiliateRate = Tables["affiliate_rates"]["Row"];

export const PAYOUT_METHODS = ["zaincash", "fib", "qi", "bank"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

/** The least finance pays out at once, in IQD. */
export const MINIMUM_PAYOUT = 25_000;

const affiliateKey = (organizationId: string) =>
  ["affiliate", organizationId] as const;

/** The application (or null), its commissions, payouts and the rates. */
export const useAffiliate = (organizationId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [affiliate, commissions, payouts, rates] = await Promise.all([
        supabase
          .from("affiliates")
          .select("*")
          .eq("organization_id", organizationId)
          .maybeSingle(),
        supabase
          .from("affiliate_commissions")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("affiliate_payouts")
          .select("*")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("affiliate_rates").select("*").order("rate", {
          ascending: false,
        }),
      ]);
      return {
        affiliate: unwrap(affiliate),
        commissions: unwrap(commissions) ?? [],
        payouts: unwrap(payouts) ?? [],
        rates: unwrap(rates) ?? [],
      };
    },
    queryKey: affiliateKey(organizationId),
  });
};

/** What's payable now and what's still in the return window. */
export const affiliateBalance = (
  commissions: readonly Pick<
    AffiliateCommission,
    "amount" | "available_at" | "status"
  >[],
  now = Date.now()
) => {
  let payable = 0;
  let waiting = 0;
  for (const commission of commissions) {
    if (commission.status !== "pending") {
      continue;
    }
    if (new Date(commission.available_at).getTime() <= now) {
      payable += commission.amount;
    } else {
      waiting += commission.amount;
    }
  }
  return { payable, waiting };
};

export interface AffiliateApplication {
  channel: string;
  payoutAccount: string;
  payoutMethod: PayoutMethod | "";
  pitch: string;
}

/**
 * Applies (or applies again after a refusal); once approved, only the
 * payout details change (`apply_affiliate`, owners and admins).
 */
export const useApplyAffiliate = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AffiliateApplication) => {
      unwrap(
        await supabase.rpc("apply_affiliate", {
          channel: input.channel.trim() || undefined,
          org: organizationId,
          payout_account: input.payoutAccount.trim() || undefined,
          payout_method: input.payoutMethod || undefined,
          pitch: input.pitch.trim(),
        })
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: affiliateKey(organizationId),
      }),
  });
};

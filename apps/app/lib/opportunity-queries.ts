"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

/**
 * Following opportunities ("Notify me"): the member hears when one opens
 * and three days before its deadline (the API's daily cron).
 */

const followsKey = (userId: string) => ["opportunity-follows", userId] as const;

/** What the member follows, newest first, with each opportunity. */
export const useMyFollows = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("opportunity_follows")
          .select(
            "opportunity_id, created_at, opportunity:opportunities (slug, kind, title_ar, title_en, host_name, opens_at, deadline, status)"
          )
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: followsKey(user?.id ?? ""),
  });
};

/** Follows or stops following one opportunity. */
export const useFollowOpportunity = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      follow,
      opportunityId,
    }: {
      follow: boolean;
      opportunityId: string;
    }) => {
      const userId = requireUserId(user?.id);
      if (follow) {
        return unwrap(
          await supabase
            .from("opportunity_follows")
            .insert({ opportunity_id: opportunityId, user_id: userId })
        );
      }
      return unwrap(
        await supabase
          .from("opportunity_follows")
          .delete()
          .eq("opportunity_id", opportunityId)
          .eq("user_id", userId)
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: followsKey(user?.id ?? "") }),
  });
};

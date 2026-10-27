"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { unwrap } from "./queries";

/**
 * The IDEA Plus paid by the company for its members (`plus_seats`). Owners
 * and admins see every seat and ask for or end them; finance approves.
 */

const key = (organizationId: string) => ["plus-seats", organizationId] as const;

export const usePlusSeats = (organizationId: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () =>
      unwrap(
        await supabase
          .from("plus_seats")
          .select(
            "id, user_id, status, created_at, ended_at, plans (name, amount), subscriptions (current_period_end)"
          )
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
      ),
    queryKey: key(organizationId),
  });
};

export const useRequestPlusSeat = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ member, plan }: { member: string; plan: string }) =>
      unwrap(
        await supabase.rpc("request_plus_seat", {
          member,
          org: organizationId,
          plan,
        })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: key(organizationId) }),
  });
};

export const useEndPlusSeat = (organizationId: string) => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seat: string) => {
      unwrap(await supabase.rpc("end_plus_seat", { seat }));
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: key(organizationId) }),
  });
};

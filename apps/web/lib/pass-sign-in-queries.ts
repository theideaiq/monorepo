"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requireUserId, unwrap } from "./queries";

const sitesKey = (userId: string) => ["pass-connections", userId] as const;

/** A partner site, for the consent screen (active ones only). */
export const usePassPartner = (clientId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && clientId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_partners")
          .select("client_id, name, website, redirect_uris, answers")
          .eq("client_id", clientId)
          .eq("active", true)
          .maybeSingle()
      ),
    queryKey: ["pass-partner", clientId],
  });
};

/** Allows the partner: returns the one-use code for its return address. */
export const useApprovePassSignIn = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      clientId: string;
      codeChallenge: string;
      nonce: string | null;
      redirectUri: string;
      scopes: string[];
    }) =>
      unwrap(
        await supabase.rpc("approve_pass_sign_in", {
          client: input.clientId,
          code_challenge: input.codeChallenge,
          nonce: input.nonce ?? undefined,
          redirect_uri: input.redirectUri,
          scopes: input.scopes,
        })
      ),
  });
};

/** Pass → Settings: the sites the member signed in to with their Pass. */
export const useConnectedSites = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_connections")
          .select(
            "client_id, scopes, granted_at, last_used_at, pass_partners (name, website)"
          )
          .eq("user_id", requireUserId(user?.id))
          .order("granted_at", { ascending: false })
      ) ?? [],
    queryKey: sitesKey(user?.id ?? ""),
  });
};

export const useDisconnectSite = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) =>
      unwrap(
        await supabase.rpc("disconnect_pass_partner", { client: clientId })
      ),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: sitesKey(user?.id ?? "") }),
  });
};

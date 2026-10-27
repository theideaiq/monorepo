"use client";

import { useAuth } from "@repo/auth/provider";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
          .select("client_id, name, website, redirect_uris, answers, mode")
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

/**
 * What the member shared with this site the last time (null when they
 * never signed in to it), so a returning member isn't asked again.
 */
export const usePassConnection = (clientId: string) => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user && clientId),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_connections")
          .select("scopes")
          .eq("user_id", requireUserId(user?.id))
          .eq("client_id", clientId)
          .maybeSingle()
      )?.scopes ?? null,
    queryKey: [...sitesKey(user?.id ?? ""), clientId],
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

/** Pass → Settings: the latest checks of the member's card by partner apps. */
export const useCardChecks = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_card_checks")
          .select("id, checked_at, pass_partners (name)")
          .eq("user_id", requireUserId(user?.id))
          .order("checked_at", { ascending: false })
          .limit(10)
      ) ?? [],
    queryKey: ["pass-card-checks", user?.id ?? ""],
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

const embedsKey = (userId: string) => ["pass-card-embeds", userId] as const;

/** Pass → Settings: the sites showing the member's live card in a frame. */
export const useCardEmbeds = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_card_embeds")
          .select("client_id, created_at, last_shown_at, pass_partners (name)")
          .eq("user_id", requireUserId(user?.id))
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: embedsKey(user?.id ?? ""),
  });
};

/** Stops a site showing the member's live card. */
export const useEndCardEmbed = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientId: string) =>
      unwrap(await supabase.rpc("end_pass_card_embed", { client: clientId })),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: embedsKey(user?.id ?? "") }),
  });
};

/** The connect popup: the member allows the site; a token for its frame. */
export const useStartCardEmbed = () => {
  const { supabase } = useAuth();
  return useMutation({
    mutationFn: async (clientId: string) =>
      unwrap(await supabase.rpc("start_pass_card_embed", { client: clientId })),
  });
};

/** What the frame shows: the card and the codes for this step and the next. */
export interface EmbeddedCard {
  code: string;
  member_number: number;
  name: string;
  next_code: string;
  plan_ar: string | null;
  plan_en: string | null;
  since: string;
  step: number;
  student: boolean;
}

/**
 * The frame's card, read with its token (no session) once per 30-second
 * step; null when the token no longer works.
 */
export const useEmbeddedCard = (
  clientId: string,
  token: string | null,
  step: number
) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
    queryFn: async () =>
      unwrap(
        await supabase.rpc("pass_card_embed", {
          client: clientId,
          token: token ?? "",
        })
      ) as EmbeddedCard | null,
    queryKey: ["pass-card-embed", clientId, token, step],
    staleTime: Number.POSITIVE_INFINITY,
  });
};

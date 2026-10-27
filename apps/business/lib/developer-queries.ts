"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { callApi } from "./api";
import { unwrap } from "./queries";

/**
 * The IDEA Business → Developers: a company's verified domains and its
 * Sign in with The IDEA Pass apps. Owners and admins manage them; the
 * database checks the role, the domains and the answers again.
 */

/** The answers an app may ask for, besides `openid`. */
export const APP_ANSWERS = [
  "profile",
  "email",
  "membership",
  "student",
  "student_email",
  "adult",
  "plus",
  "phone",
  "birthdate",
  "address",
  "card",
  "offline_access",
] as const;

export type AppAnswer = (typeof APP_ANSWERS)[number];

/** Answers we review before a live app may ask them. */
export const SENSITIVE_ANSWERS: readonly AppAnswer[] = [
  "student_email",
  "phone",
  "birthdate",
  "address",
  "offline_access",
];

export interface Credentials {
  clientId: string;
  secret: string;
}

const domainsKey = (org: string) => ["pass-domains", org] as const;
const appsKey = (org: string) => ["pass-apps", org] as const;

export const usePassDomains = (org: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .from("pass_partner_domains")
          .select("id, domain, token, verified_at, checked_at")
          .eq("organization_id", org)
          .order("created_at")
      ) ?? [],
    queryKey: domainsKey(org),
  });
};

export const usePassApps = (org: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => unwrap(await supabase.rpc("pass_apps", { org })) ?? [],
    queryKey: appsKey(org),
  });
};

export type PassApp = NonNullable<
  ReturnType<typeof usePassApps>["data"]
>[number];

/** Refreshes both lists after a change. */
const useRefresh = (org: string) => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: domainsKey(org) }),
      queryClient.invalidateQueries({ queryKey: appsKey(org) }),
    ]);
};

export const useAddDomain = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (name: string) =>
      unwrap(await supabase.rpc("add_pass_domain", { name, org })),
    onSuccess: refresh,
  });
};

export const useRemoveDomain = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (target: string) =>
      unwrap(await supabase.rpc("remove_pass_domain", { target })),
    onSuccess: refresh,
  });
};

/** Asks the API to look for the token (DNS TXT record, then the file). */
export const useVerifyDomain = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: (id: string) =>
      callApi<{ verified: boolean }>(supabase, "/pass/domains/verify", { id }),
    onSettled: refresh,
  });
};

export interface AppInput {
  answers: AppAnswer[];
  name: string;
  redirectUris: string[];
  website: string;
}

export const useCreateApp = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (input: AppInput): Promise<Credentials> => {
      const made = unwrap(
        await supabase.rpc("create_pass_app", {
          answers: input.answers,
          name: input.name,
          org,
          redirect_uris: input.redirectUris,
          website: input.website,
        })
      ) as { client_id: string; client_secret: string };
      return { clientId: made.client_id, secret: made.client_secret };
    },
    onSuccess: refresh,
  });
};

export const useUpdateApp = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (input: AppInput & { client: string }) =>
      unwrap(
        await supabase.rpc("update_pass_app", {
          answers: input.answers,
          client: input.client,
          name: input.name,
          redirect_uris: input.redirectUris,
          website: input.website,
        })
      ),
    onSuccess: refresh,
  });
};

export const useSetAppState = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (input: {
      client: string;
      enabled: boolean;
      live: boolean;
    }) => unwrap(await supabase.rpc("set_pass_app_state", input)),
    onSuccess: refresh,
  });
};

export const useRotateSecret = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (input: {
      client: string;
      keepPrevious: boolean;
    }): Promise<Credentials> => ({
      clientId: input.client,
      secret: unwrap(
        await supabase.rpc("rotate_pass_app_secret", {
          client: input.client,
          keep_previous: input.keepPrevious,
        })
      ) as string,
    }),
    onSuccess: refresh,
  });
};

export const useEndPreviousSecret = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (client: string) =>
      unwrap(await supabase.rpc("end_previous_pass_secret", { client })),
    onSuccess: refresh,
  });
};

export const useSetAppKeys = (org: string) => {
  const { supabase } = useAuth();
  const refresh = useRefresh(org);
  return useMutation({
    mutationFn: async (input: { client: string; jwks: object | null }) =>
      unwrap(
        await supabase.rpc("set_pass_app_keys", {
          client: input.client,
          // A null JSON argument removes the keys.
          jwks: input.jwks as never,
        })
      ),
    onSuccess: refresh,
  });
};

const ERRORS = {
  "A return address isn't on a verified domain": "redirectNotVerified",
  "An app uses this domain": "domainInUse",
  "Invalid keys": "invalidKeys",
  "Invalid return address": "invalidRedirect",
  "Not allowed": "notAllowed",
  "The website isn't on a verified domain": "websiteNotVerified",
  "This domain can't be used": "domainNotAllowed",
  "Too many apps": "tooManyApps",
  "Too many domains": "tooManyDomains",
  too_soon: "tooSoon",
} as const;

export type DeveloperError =
  | (typeof ERRORS)[keyof typeof ERRORS]
  | "invalidDomain"
  | "unknown";

/** The message key for an error from the database or the API. */
export const developerError = (error: unknown): DeveloperError => {
  const { code = "", message = "" } = (error ?? {}) as {
    code?: string;
    message?: string;
  };
  for (const [text, key] of Object.entries(ERRORS)) {
    if (message.includes(text) || code === text) {
      return key;
    }
  }
  // The domain's own check (a real domain name).
  if (code === "23514") {
    return "invalidDomain";
  }
  return "unknown";
};

/** One address per line, trimmed, without blanks. */
export const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

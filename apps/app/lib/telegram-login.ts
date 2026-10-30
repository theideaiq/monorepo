"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { env } from "@/env";
import { callApi } from "./api";
import { queryKeys, unwrap } from "./queries";

/**
 * Telegram sign-in (OpenID Connect, run by apps/api): "Continue with
 * Telegram" sends the browser to the API, which sends it to Telegram and
 * back to /sign-in/telegram with a sign-in token (a linked account) or a
 * ticket to link a new one once the member has signed in.
 */

/** Whether Telegram sign-in is set up on the API. */
export const useTelegramAvailable = () =>
  useQuery({
    enabled: Boolean(env.NEXT_PUBLIC_API_URL),
    queryFn: async () => {
      const response = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/auth/telegram/available`
      );
      const body = (await response.json()) as { available?: boolean };
      return body.available === true;
    },
    queryKey: ["telegram-available"],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });

/** The API address that starts Telegram sign-in. */
export const telegramStartUrl = (
  locale: string,
  returnTo?: string | null,
  /** Connecting from Your Pass: link to this member, never sign in as another. */
  link = false
) => {
  const url = new URL(`${env.NEXT_PUBLIC_API_URL}/auth/telegram/start`);
  url.searchParams.set("locale", locale);
  if (link) {
    url.searchParams.set("mode", "link");
  }
  if (returnTo) {
    url.searchParams.set("return_to", returnTo);
  }
  return url.toString();
};

/** The member's linked Telegram account, or null. */
export const useMyTelegram = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_telegram"))?.[0] ?? null,
    queryKey: queryKeys.telegram(user?.id ?? ""),
  });
};

const useRefreshTelegram = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.telegram(user?.id ?? ""),
    });
};

/** Links the account a sign-in ticket vouches for to the signed-in member. */
export const useLinkTelegram = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshTelegram();
  return useMutation({
    mutationFn: (ticket: string) =>
      callApi<{ username: string | null }>(supabase, "/auth/telegram/link", {
        ticket,
      }),
    onSuccess: refresh,
  });
};

export const useUnlinkTelegram = () => {
  const { supabase } = useAuth();
  const refresh = useRefreshTelegram();
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc("unlink_telegram")),
    onSuccess: refresh,
  });
};

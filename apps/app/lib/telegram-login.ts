"use client";

import { useAuth } from "@repo/auth/provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, unwrap } from "./queries";

/**
 * Telegram is a sign-in provider of Supabase Auth (`custom:telegram`,
 * connected with linkIdentity from Settings). The database links its
 * Telegram account to the Pass for the bot (`telegram_members`) when the
 * identity is added and unlinks it when the identity goes.
 */

/** The member's linked Telegram account, or null. */
export const useMyTelegram = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => unwrap(await supabase.rpc("my_telegram"))?.[0] ?? null,
    queryKey: queryKeys.telegram(user?.id ?? ""),
  });
};

/**
 * Disconnects Telegram: removes the Telegram sign-in (which unlinks the
 * bot account), or for a link made before Telegram moved to Supabase Auth,
 * the link alone.
 */
export const useUnlinkTelegram = () => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) {
        throw error;
      }
      const identity = data.identities.find(
        (item) => item.provider === "custom:telegram"
      );
      if (identity) {
        const unlinked = await supabase.auth.unlinkIdentity(identity);
        if (unlinked.error) {
          throw unlinked.error;
        }
      } else {
        unwrap(await supabase.rpc("unlink_telegram"));
      }
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.telegram(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({ queryKey: ["identities"] }),
      ]),
  });
};

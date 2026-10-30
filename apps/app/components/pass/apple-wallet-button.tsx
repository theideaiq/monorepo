"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { formatDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { WalletIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { callApi } from "@/lib/api";
import { openCheckout } from "@/lib/hosted-checkout";
import { unwrap } from "@/lib/queries";

const APPLE_DEVICE = /iPhone|iPad|iPod|Macintosh/;

const subscribe = () => () => undefined;

/** Whether this is an Apple device (null on the server, so nothing flashes). */
const useAppleDevice = (): boolean | null =>
  useSyncExternalStore(
    subscribe,
    () => APPLE_DEVICE.test(navigator.userAgent),
    () => null
  );

/**
 * "Add to Apple Wallet": the card with a fixed code, since Apple Wallet
 * can't change it every 30 seconds. Adding it again replaces the one in
 * Apple Wallet, and it can be turned off here. Shown on Apple devices
 * once The IDEA's Pass Type ID is set up (apps/api).
 */
export const AppleWalletButton = () => {
  const t = useTranslations("pass.card");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const apple = useAppleDevice();
  const available = useQuery({
    enabled: Boolean(user) && apple === true,
    queryFn: async () =>
      (
        await callApi<{ available: boolean }>(supabase, "/pass/apple-wallet", {
          check: true,
        })
      ).available,
    queryKey: ["apple-wallet"],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const added = useQuery({
    enabled: Boolean(user) && available.data === true,
    queryFn: async () => unwrap(await supabase.rpc("my_wallet_card")),
    queryKey: ["apple-wallet", "card", user?.id ?? ""],
  });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["apple-wallet", "card"] });
  const save = useMutation({
    mutationFn: async () => {
      const { url } = await callApi<{ url: string }>(
        supabase,
        "/pass/apple-wallet",
        {}
      );
      // Safari opens the card in Apple Wallet; the system browser in the apps.
      await openCheckout(url);
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => {
      unwrap(await supabase.rpc("remove_wallet_card"));
    },
    onSettled: refresh,
  });

  if (!available.data) {
    return null;
  }
  return (
    <div className="grid gap-1">
      <Button
        className="w-full"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        variant="outline"
      >
        <WalletIcon />
        {t("addToAppleWallet")}
      </Button>
      {added.data ? (
        <p className="flex flex-wrap items-center gap-x-2 text-muted-foreground text-sm">
          {t("appleWalletAdded", { date: formatDate(added.data, locale) })}
          <Button
            className="h-auto p-0"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            variant="link"
          >
            {t("appleWalletTurnOff")}
          </Button>
        </p>
      ) : null}
      {save.isError || remove.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("appleWalletFailed")}
        </p>
      ) : null}
    </div>
  );
};

"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { WalletIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { callApi } from "@/lib/api";
import { openCheckout } from "@/lib/hosted-checkout";

/**
 * "Add to Google Wallet": the card with the same code, rotating by itself.
 * Shown only once The IDEA's Google Wallet issuer is set up (apps/api).
 */
export const WalletButton = () => {
  const t = useTranslations("pass.card");
  const { supabase, user } = useAuth();
  const available = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (
        await callApi<{ available: boolean }>(supabase, "/pass/wallet", {
          check: true,
        })
      ).available,
    queryKey: ["google-wallet"],
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const save = useMutation({
    mutationFn: async () => {
      const { url } = await callApi<{ url: string }>(
        supabase,
        "/pass/wallet",
        {}
      );
      // The system browser in the iOS/Android apps, this tab on the web.
      await openCheckout(url);
    },
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
        {t("addToWallet")}
      </Button>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("walletFailed")}
        </p>
      ) : null}
    </div>
  );
};

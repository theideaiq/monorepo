"use client";

import { useAuth } from "@repo/auth/provider";
import { rememberReturnTo, startSocialSignIn } from "@repo/auth/social";
import { Button } from "@repo/design-system/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { SendIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  openInSystemBrowser,
  socialRedirect,
} from "@/components/pass/social-buttons";
import { isNativeApp } from "@/lib/platform";
import { useMyTelegram, useUnlinkTelegram } from "@/lib/telegram-login";

/**
 * Pass → Settings → Connections, inside the sign-in methods: the linked
 * Telegram account (sign in with it, order updates from the bot) or a
 * button to connect one (Bulbs the first time), through Supabase Auth.
 */
export const TelegramMethod = ({
  available,
}: {
  /** Telegram is named in NEXT_PUBLIC_AUTH_PROVIDERS. */
  readonly available: boolean;
}) => {
  const t = useTranslations("app.settings.telegram");
  const locale = useLocale();
  const { supabase } = useAuth();
  const telegram = useMyTelegram();
  const unlink = useUnlinkTelegram();
  const connect = useMutation({
    mutationFn: async () => {
      rememberReturnTo(window.location.pathname);
      const native = isNativeApp();
      const result = await startSocialSignIn(supabase, "telegram", {
        link: true,
        openExternal: native ? openInSystemBrowser : undefined,
        redirectTo: socialRedirect(locale),
      });
      if (!result.ok) {
        throw new Error(result.error);
      }
    },
  });

  if (telegram.isPending || !(telegram.data || available)) {
    return null;
  }
  const linked = telegram.data;

  return (
    <div className="grid gap-3 border-t pt-3">
      <div className="grid gap-1">
        <h3 className="font-medium text-sm">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">
          {linked ? t("linkedDescription") : t("description")}
        </p>
      </div>
      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" dir="auto">
            {linked.username
              ? t("linkedAs", { name: `@${linked.username}` })
              : t("linkedAs", { name: linked.first_name ?? "" })}
          </p>
          <Button
            disabled={unlink.isPending}
            onClick={() => unlink.mutate()}
            type="button"
            variant="outline"
          >
            {t("disconnect")}
          </Button>
        </div>
      ) : (
        <Button
          className="w-full"
          disabled={connect.isPending}
          onClick={() => connect.mutate()}
          type="button"
          variant="outline"
        >
          <SendIcon aria-hidden="true" />
          {t("connect")}
        </Button>
      )}
      {unlink.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {connect.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("connectFailed")}
        </p>
      ) : null}
    </div>
  );
};

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useTranslations } from "next-intl";
import { TelegramButton } from "@/components/pass/telegram-button";
import {
  useMyTelegram,
  useTelegramAvailable,
  useUnlinkTelegram,
} from "@/lib/telegram-login";

/**
 * Pass → Settings → Connections, inside the sign-in methods: the linked
 * Telegram account (sign in with it, order updates from the bot) or a
 * button to connect one (Bulbs the first time).
 */
export const TelegramMethod = () => {
  const t = useTranslations("app.settings.telegram");
  const available = useTelegramAvailable();
  const telegram = useMyTelegram();
  const unlink = useUnlinkTelegram();

  if (telegram.isPending || (!telegram.data && available.data !== true)) {
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
        <TelegramButton
          label={t("connect")}
          link
          returnTo={
            typeof window === "undefined" ? null : window.location.pathname
          }
        />
      )}
      {unlink.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { useTranslations } from "next-intl";
import { TelegramButton } from "@/components/pass/telegram-button";
import {
  useMyTelegram,
  useTelegramAvailable,
  useUnlinkTelegram,
} from "@/lib/telegram-login";

/**
 * Your Pass → Settings: the linked Telegram account (sign in with it, order
 * updates from the bot) or a button to connect one (10 Bulbs the first
 * time).
 */
export const TelegramSettingsCard = () => {
  const t = useTranslations("app.settings.telegram");
  const available = useTelegramAvailable();
  const telegram = useMyTelegram();
  const unlink = useUnlinkTelegram();

  if (telegram.isPending || (!telegram.data && available.data !== true)) {
    return null;
  }
  const linked = telegram.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {linked ? t("linkedDescription") : t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
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
      </CardContent>
    </Card>
  );
};

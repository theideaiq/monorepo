"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { SendIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { telegramStartUrl, useTelegramAvailable } from "@/lib/telegram-login";

/**
 * "Continue with Telegram", once the API has Telegram sign-in set up.
 * A full page load: the API sends the browser on to Telegram.
 */
export const TelegramButton = ({
  label,
  link = false,
  returnTo,
}: {
  readonly label?: string;
  /** Connect to the signed-in member (Your Pass) rather than sign in. */
  readonly link?: boolean;
  readonly returnTo?: string | null;
}) => {
  const t = useTranslations("pass.telegram");
  const locale = useLocale();
  const available = useTelegramAvailable();
  if (available.data !== true) {
    return null;
  }
  return (
    <Button asChild className="w-full" variant="outline">
      <a href={telegramStartUrl(locale, returnTo, link)}>
        <SendIcon aria-hidden="true" />
        {label ?? t("continue")}
      </a>
    </Button>
  );
};

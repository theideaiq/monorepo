"use client";

import { formatPrice, INVITE_DISCOUNT_CAP } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { CheckIcon, CopyIcon, GiftIcon, Share2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useMyInvites } from "@/lib/invites";

/**
 * Invite friends: the member's link to share or copy, and how their invites
 * are doing. Friends get 10% off their first order; the member earns 50
 * Bulbs once it's delivered.
 */
export const InviteCard = () => {
  const t = useTranslations("app.friends");
  const locale = useLocale() as Locale;
  const invites = useMyInvites();
  const [copied, setCopied] = useState(false);

  const code = invites.data?.code;
  if (!code) {
    return null;
  }
  const link = `${window.location.origin}/r/${code}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: t("shareText"), url: link });
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <GiftIcon aria-hidden="true" className="size-5 text-pink-text" />
        <h2 className="font-semibold">{t("title")}</h2>
      </div>
      <p className="text-muted-foreground text-sm">
        {t("description", { cap: formatPrice(INVITE_DISCOUNT_CAP, locale) })}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm"
          dir="ltr"
        >
          {link}
        </code>
        <Button onClick={copy} size="sm" type="button" variant="outline">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? t("copied") : t("copy")}
        </Button>
        {canShare ? (
          <Button onClick={share} size="sm" type="button">
            <Share2Icon />
            {t("share")}
          </Button>
        ) : null}
      </div>
      <p className="text-muted-foreground text-xs">
        {t("stats", {
          invited: formatNumber(invites.data?.invited ?? 0, locale),
          rewarded: formatNumber(invites.data?.rewarded ?? 0, locale),
        })}
      </p>
    </section>
  );
};

"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { formatDate } from "@repo/internationalization/format";
import { CheckIcon, CopyIcon, GiftIcon, Share2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useGiftLink, useSentGift } from "@/lib/gifts";

interface GiftOrderCardProps {
  readonly orderId: string;
  readonly status: string;
}

/** Statuses where the gift can still be claimed (and its link shared). */
const OPEN = new Set(["pending", "paid", "confirmed"]);

/**
 * The buyer's gift: the message, whether it was claimed, and its link to
 * share (a new link replaces the old one).
 */
export const GiftOrderCard = ({ orderId, status }: GiftOrderCardProps) => {
  const t = useTranslations("app.orders.detail.gift");
  const locale = useLocale();
  const id = useId();
  const gift = useSentGift(orderId, true);
  const link = useGiftLink();
  const [copied, setCopied] = useState(false);
  const url = link.data ?? null;
  const claimedAt = gift.data?.claimed_at ?? null;
  const shareable = !claimedAt && OPEN.has(status);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // The link stays selectable in the field.
    }
  };

  const share = async (value: string) => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: t("shareText"), url: value });
        return;
      } catch {
        // Cancelled or not allowed: fall back to copying.
      }
    }
    await copy(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {claimedAt
            ? t("claimed", { date: formatDate(claimedAt, locale) })
            : t("waiting")}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        {gift.data?.message ? (
          <blockquote className="whitespace-pre-line border-s-2 ps-3 text-muted-foreground">
            {gift.data.message}
          </blockquote>
        ) : null}
        {gift.data ? (
          <p className="text-muted-foreground text-xs">
            {gift.data.hide_price ? t("priceHidden") : t("priceShown")}
          </p>
        ) : null}
        {shareable && url ? (
          <div className="grid gap-2">
            <label className="font-medium" htmlFor={`${id}-link`}>
              {t("link")}
            </label>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                id={`${id}-link`}
                onFocus={(event) => event.target.select()}
                readOnly
                value={url}
              />
              <Button
                aria-label={t("copy")}
                onClick={() => copy(url)}
                size="icon"
                type="button"
                variant="outline"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">{t("linkHint")}</p>
          </div>
        ) : null}
        {shareable ? (
          <Button
            className="justify-self-start"
            disabled={link.isPending}
            onClick={() =>
              link.mutate(orderId, {
                onSuccess: (value) => {
                  setCopied(false);
                  share(value);
                },
              })
            }
            type="button"
          >
            <Share2Icon />
            {url ? t("newLink") : t("share")}
          </Button>
        ) : null}
        {link.isError ? (
          <p className="text-destructive" role="alert">
            {t("linkFailed")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

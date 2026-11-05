"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useShopHealth } from "@/lib/today-queries";

/**
 * A24: the shop's health on Today. Its 90-day score (the one buyers see
 * beside "Sold by") and what it is made of: lines due, lines ready late,
 * items out of stock, returns that were the shop's fault and auction marks
 * judged wrong, with what each costs. Nothing when there's nothing to read.
 */
export const ShopHealth = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.partners.today.health");
  const locale = useLocale() as Locale;
  const health = useShopHealth(sellerId);
  const row = health.data;
  if (!row) {
    return null;
  }
  const n = (value: number) => formatNumber(value, locale);
  const parts = [
    { key: "late", value: row.late },
    { key: "outOfStock", value: row.out_of_stock },
    { key: "returns", value: row.shop_returns },
    { key: "wrongMarks", value: row.wrong_marks },
  ] as const;
  const quiet = row.lines + row.marks_reviewed === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 text-sm">
        <p>
          <span className="font-bold font-mono text-3xl">
            {n(Math.round(Number(row.score)))}
          </span>{" "}
          <span className="text-muted-foreground">{t("outOf")}</span>
        </p>
        {quiet ? (
          <p className="text-muted-foreground">{t("quiet")}</p>
        ) : (
          <>
            <p className="text-muted-foreground">
              {t("lines", { lines: n(row.lines) })}
            </p>
            <dl className="grid gap-2 sm:grid-cols-2">
              {parts.map((part) => (
                <div
                  className="flex items-baseline justify-between gap-3 rounded-lg border p-3"
                  key={part.key}
                >
                  <dt>
                    <span className="block">{t(`${part.key}.label`)}</span>
                    <span className="block text-muted-foreground text-xs">
                      {t(`${part.key}.weight`)}
                    </span>
                  </dt>
                  <dd className="font-mono font-semibold text-lg">
                    {n(part.value)}
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </CardContent>
    </Card>
  );
};

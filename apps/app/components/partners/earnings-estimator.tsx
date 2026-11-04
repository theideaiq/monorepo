"use client";

import { formatPrice } from "@repo/commerce";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import type { CommissionRate } from "@/lib/data";

/** What a shop is paid for one sale: the price less the category's commission. */
export const payoutFor = (price: number, rate: number) =>
  Math.max(0, Math.round(price * (1 - rate)));

/**
 * "What you'd be paid": a price and a category give the commission and the
 * payout for one sale on Free and on Pro, from the rates finance sets in
 * Staff. Refunds, returns at the shop's fault and the Pro fee come off
 * payouts too, and the note says so.
 */
export const EarningsEstimator = ({
  rates,
}: {
  readonly rates: readonly CommissionRate[];
}) => {
  const t = useTranslations("web.partners.selling.estimator");
  const locale = useLocale();
  const id = useId();
  const [slug, setSlug] = useState(rates[0]?.slug ?? "");
  const [price, setPrice] = useState(50_000);
  const rate = rates.find((row) => row.slug === slug);
  if (!rate) {
    return null;
  }
  const valid = Number.isFinite(price) && price > 0;
  const percent = (value: number) =>
    `${formatNumber(Math.round(value * 1000) / 10, locale)}%`;

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-5">
      <h3 className="font-semibold text-lg">{t("title")}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-category`}>{t("category")}</Label>
          <Select onValueChange={setSlug} value={slug}>
            <SelectTrigger id={`${id}-category`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rates.map((row) => (
                <SelectItem key={row.slug} value={row.slug}>
                  {locale === "en" ? row.name_en : row.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-price`}>{t("price")}</Label>
          <Input
            dir="ltr"
            id={`${id}-price`}
            inputMode="numeric"
            min={250}
            onChange={(event) => setPrice(Number(event.target.value))}
            step={250}
            type="number"
            value={Number.isFinite(price) ? price : ""}
          />
        </div>
      </div>
      {valid ? (
        <dl aria-live="polite" className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["free", rate.standard],
              ["pro", rate.pro],
            ] as const
          ).map(([plan, value]) => (
            <div className="grid gap-1 rounded-md border p-3" key={plan}>
              <dt className="text-muted-foreground text-sm">
                {t(plan, { rate: percent(value) })}
              </dt>
              <dd className="font-bold font-mono text-xl">
                {formatPrice(payoutFor(price, value), locale)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <p className="text-muted-foreground text-xs">{t("note")}</p>
    </div>
  );
};

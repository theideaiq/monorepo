"use client";

import { discountPercent, formatPrice } from "@repo/commerce";
import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";

interface PriceProps {
  readonly className?: string;
  readonly compareAtPrice?: number | null;
  /** The lowest of several variants' prices: reads "From …". */
  readonly from?: boolean;
  readonly price: number;
}

/** A price with the struck-through compare-at price and the saving. */
export const Price = ({
  className,
  compareAtPrice,
  from = false,
  price,
}: PriceProps) => {
  const t = useTranslations("store.price");
  const locale = useLocale();
  const percent = discountPercent(price, compareAtPrice);

  return (
    <span className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-semibold tabular-nums">
        {from
          ? t("from", { price: formatPrice(price, locale) })
          : formatPrice(price, locale)}
      </span>
      {percent > 0 && compareAtPrice ? (
        <>
          <span className="text-muted-foreground text-xs tabular-nums line-through">
            {formatPrice(compareAtPrice, locale)}
          </span>
          <span className="font-medium text-pink-text text-xs">
            {t("save", { percent: formatNumber(percent, locale) })}
          </span>
        </>
      ) : null}
    </span>
  );
};

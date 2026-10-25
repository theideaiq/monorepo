"use client";

import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";

/** Few enough copies left to say so. */
export const LOW_STOCK = 5;

/** "In stock", "Only 3 left" or "Out of stock". */
export const StockBadge = ({
  className,
  count,
}: {
  readonly className?: string;
  readonly count: number;
}) => {
  const t = useTranslations("store.stock");
  const locale = useLocale();

  if (count <= 0) {
    return (
      <span className={cn("text-muted-foreground text-xs", className)}>
        {t("outOfStock")}
      </span>
    );
  }
  if (count <= LOW_STOCK) {
    return (
      <span className={cn("text-warning text-xs", className)}>
        {t("lowStock", { count: formatNumber(count, locale) })}
      </span>
    );
  }
  return (
    <span className={cn("text-success text-xs", className)}>
      {t("inStock")}
    </span>
  );
};

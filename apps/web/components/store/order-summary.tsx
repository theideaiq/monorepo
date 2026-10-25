"use client";

import { formatPrice } from "@repo/commerce";
import { useLocale, useTranslations } from "next-intl";

interface OrderSummaryProps {
  readonly shippingFee: number;
  readonly subtotal: number;
  readonly total: number;
}

/** Subtotal, delivery and total rows, for the cart, checkout and orders. */
export const OrderSummary = ({
  shippingFee,
  subtotal,
  total,
}: OrderSummaryProps) => {
  const t = useTranslations("app.cart");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();

  return (
    <dl className="grid gap-2 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{t("subtotal")}</dt>
        <dd className="tabular-nums">{formatPrice(subtotal, locale)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{t("shipping")}</dt>
        <dd className="tabular-nums">
          {shippingFee === 0 && subtotal > 0
            ? tCommon("free")
            : formatPrice(shippingFee, locale)}
        </dd>
      </div>
      <div className="flex justify-between gap-4 border-t pt-2 font-semibold text-base">
        <dt>{t("total")}</dt>
        <dd className="tabular-nums">{formatPrice(total, locale)}</dd>
      </div>
    </dl>
  );
};

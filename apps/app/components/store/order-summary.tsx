"use client";

import { type DiscountSource, formatPrice } from "@repo/commerce";
import { formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";

interface OrderSummaryProps {
  /** IQD paid with Bulbs, and how many. */
  readonly bulbsDiscount?: number;
  readonly bulbsUsed?: number;
  /** Refundable deposits included in `subtotal`, shown on their own row. */
  readonly deposits?: number;
  /** IQD off from a friend's invite or a coupon. */
  readonly discount?: number;
  /** `orders.discount_source`: "coupon" labels the row as a coupon. */
  readonly discountSource?: DiscountSource | (string & {}) | null;
  readonly shippingFee: number;
  readonly subtotal: number;
  readonly total: number;
}

/**
 * Subtotal, delivery, Bulbs and total rows, for the cart, checkout and
 * orders.
 */
export const OrderSummary = ({
  bulbsDiscount = 0,
  bulbsUsed = 0,
  deposits = 0,
  discount = 0,
  discountSource = null,
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
        <dd className="tabular-nums">
          {formatPrice(subtotal - deposits, locale)}
        </dd>
      </div>
      {deposits > 0 ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{t("deposits")}</dt>
          <dd className="tabular-nums">{formatPrice(deposits, locale)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4">
        <dt className="text-muted-foreground">{t("shipping")}</dt>
        <dd className="tabular-nums">
          {shippingFee === 0 && subtotal > 0
            ? tCommon("free")
            : formatPrice(shippingFee, locale)}
        </dd>
      </div>
      {discount > 0 ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t(discountSource === "coupon" ? "coupon" : "discount")}
          </dt>
          <dd className="tabular-nums" dir="ltr">
            −{formatPrice(discount, locale)}
          </dd>
        </div>
      ) : null}
      {bulbsDiscount > 0 ? (
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {t("bulbs", { bulbs: formatNumber(bulbsUsed, locale) })}
          </dt>
          <dd className="tabular-nums" dir="ltr">
            −{formatPrice(bulbsDiscount, locale)}
          </dd>
        </div>
      ) : null}
      <div className="flex justify-between gap-4 border-t pt-2 font-semibold text-base">
        <dt>{t("total")}</dt>
        <dd className="tabular-nums">{formatPrice(total, locale)}</dd>
      </div>
    </dl>
  );
};

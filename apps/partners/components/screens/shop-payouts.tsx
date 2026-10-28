"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatDateTime } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { type ShopPayout, useShopPayouts } from "@/lib/payout-queries";
import { useSeller } from "@/lib/seller-queries";
import { type ShopLine, useShopLines } from "@/lib/shop-order-queries";

type Line = ShopPayout["lines"][number];

const LineLabel = ({
  line,
  orderLines,
}: {
  readonly line: Line;
  readonly orderLines: ReadonlyMap<string, ShopLine>;
}) => {
  const t = useTranslations("app.company.shopPayouts");
  const locale = useLocale() as Locale;
  if (line.kind === "sale") {
    const sold = line.order_item_id ? orderLines.get(line.order_item_id) : null;
    return sold
      ? t("sale", {
          name: locale === "ar" ? sold.name_ar : sold.name_en,
          order: sold.order_number,
          quantity: String(sold.quantity),
        })
      : t("saleUnknown");
  }
  if (line.kind === "collection_fee") {
    return t("collectionFee");
  }
  return t("proFee", {
    date: line.covers_until
      ? formatDate(`${line.covers_until}T12:00:00`, locale)
      : "",
  });
};

const PayoutRow = ({
  orderLines,
  payout,
}: {
  readonly orderLines: ReadonlyMap<string, ShopLine>;
  readonly payout: ShopPayout;
}) => {
  const t = useTranslations("app.company.shopPayouts");
  const locale = useLocale() as Locale;
  return (
    <li className="grid gap-2 p-3 text-sm">
      <details>
        <summary className="flex cursor-pointer flex-wrap items-center gap-2">
          <span className="font-medium">
            {t("payout", {
              number: String(payout.number),
              period: formatDate(`${payout.period_end}T12:00:00`, locale),
            })}
          </span>
          <Badge variant="secondary">{t(`status.${payout.status}`)}</Badge>
          <span className="ms-auto font-semibold tabular-nums">
            {formatPrice(payout.amount, locale)}
          </span>
        </summary>
        {payout.paid_at && payout.method ? (
          <p className="mt-2 text-muted-foreground">
            {t("paidOn", {
              method: t(
                `methods.${payout.method as "bank" | "qi" | "zaincash"}`
              ),
              reference: payout.reference ?? "",
              time: formatDateTime(payout.paid_at, locale),
            })}
          </p>
        ) : null}
        <ul className="mt-2 divide-y rounded-md border">
          {payout.lines.map((line) => (
            <li
              className="flex flex-wrap items-center gap-2 px-3 py-2"
              key={line.id}
            >
              <span className="min-w-0 flex-1">
                <LineLabel line={line} orderLines={orderLines} />
              </span>
              <span className="tabular-nums">
                {formatPrice(line.amount, locale)}
              </span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
};

const PayoutsBody = () => {
  const t = useTranslations("app.company.shopPayouts");
  const { active } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const payouts = useShopPayouts(sellerId);
  const lines = useShopLines(sellerId);

  if (shop.isPending || (sellerId && payouts.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || payouts.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : payouts.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const orderLines = new Map(
    (lines.data ?? []).map((line) => [line.line_id, line])
  );
  const all = payouts.data ?? [];

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("none")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {all.map((payout) => (
                <PayoutRow
                  key={payout.id}
                  orderLines={orderLines}
                  payout={payout}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Partners → Selling → Payouts: each weekly payout from The IDEA with its
 * statement (items paid after commission, fees deducted).
 */
export const ShopPayouts = () => (
  <BusinessShell feature="selling">
    <PayoutsBody />
  </BusinessShell>
);

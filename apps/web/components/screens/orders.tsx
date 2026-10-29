"use client";

import { formatPrice, localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ChevronRightIcon, GiftIcon, PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderStatusBadge } from "@/components/store/order-status-badge";
import { useReceivedGifts } from "@/lib/gifts";
import { orderPath } from "@/lib/order-checkout";
import { itemCount } from "@/lib/orders";
import { useOrders } from "@/lib/store-queries";

/** The gifts the member received: who from, what, and how far along. */
const ReceivedGifts = () => {
  const t = useTranslations("app.orders.gifts");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const gifts = useReceivedGifts();

  if (!gifts.data?.length) {
    return null;
  }
  return (
    <section aria-labelledby="gifts-title" className="grid gap-3" id="gifts">
      <h2
        className="flex items-center gap-2 font-semibold text-lg"
        id="gifts-title"
      >
        <GiftIcon className="size-5" />
        {t("title")}
      </h2>
      <ul className="divide-y rounded-lg border">
        {gifts.data.map((gift) => (
          <li className="grid gap-1 p-4" key={gift.order_id}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">
                {gift.from ? t("from", { name: gift.from }) : t("fromSomeone")}
              </span>
              <OrderStatusBadge status={gift.status} />
            </div>
            <span className="text-sm">
              {gift.items
                .map((item) => localized(item, "name", locale))
                .join(" · ")}
            </span>
            <span className="text-muted-foreground text-xs">
              {gift.number
                ? tCommon("orderNumber", { number: String(gift.number) })
                : null}
              {gift.claimed_at
                ? ` · ${t("claimed", { date: formatDate(gift.claimed_at, locale) })}`
                : null}
            </span>
            {gift.message ? (
              <p className="whitespace-pre-line text-muted-foreground text-sm">
                {gift.message}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const Orders = () => {
  const t = useTranslations("app.orders");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const orders = useOrders();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("description")}</p>
        {orders.isPending ? <SectionSpinner /> : null}
        {orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : null}
        {orders.data?.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PackageIcon />
              </EmptyMedia>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/store">{t("empty.browse")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {orders.data?.length ? (
          <ul className="divide-y rounded-lg border">
            {orders.data.map((order) => (
              <li key={order.id}>
                <Link
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
                  href={orderPath(order.id)}
                >
                  <div className="grid min-w-0 flex-1 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">
                        {tCommon("orderNumber", {
                          number: String(order.number),
                        })}
                      </span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {t("placed", {
                        date: formatDate(order.created_at, locale),
                      })}
                      {" · "}
                      {t("itemsCount", {
                        count: formatNumber(
                          itemCount(order.order_items),
                          locale
                        ),
                      })}
                    </span>
                  </div>
                  <span className="font-medium text-sm tabular-nums">
                    {formatPrice(order.total, locale)}
                  </span>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  <span className="sr-only">{t("view")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        <ReceivedGifts />
      </div>
    </>
  );
};

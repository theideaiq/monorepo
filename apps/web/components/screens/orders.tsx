"use client";

import { formatPrice } from "@repo/commerce";
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
import { ChevronRightIcon, PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderStatusBadge } from "@/components/store/order-status-badge";
import { orderPath } from "@/lib/order-checkout";
import { itemCount } from "@/lib/orders";
import { useOrders } from "@/lib/store-queries";

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
      </div>
    </>
  );
};

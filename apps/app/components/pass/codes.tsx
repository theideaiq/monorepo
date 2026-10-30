"use client";

import { localized } from "@repo/commerce";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { KeyRoundIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderCodes } from "@/components/store/digital-codes";
import { orderPath } from "@/lib/order-checkout";
import { useOrders } from "@/lib/store-queries";

/**
 * `/pass/codes`: the digital codes (gift cards, game credit) the member
 * bought, order by order, each revealed where it's ready.
 */
export const Codes = () => {
  const t = useTranslations("app.pass.codes");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const orders = useOrders();
  const withCodes = (orders.data ?? []).filter((order) =>
    order.order_items.some((item) => item.kind === "digital")
  );

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("description")}</p>
        {orders.isPending ? <SectionSpinner /> : null}
        {orders.isError ? (
          <ErrorState onRetry={() => orders.refetch()} />
        ) : null}
        {orders.data && withCodes.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <KeyRoundIcon />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("empty")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {withCodes.map((order) => (
          <section className="grid gap-2" key={order.id}>
            <Link
              className="font-medium text-sm hover:underline"
              href={orderPath(order.id)}
            >
              {tCommon("orderNumber", { number: String(order.number) })}
              {" · "}
              {formatDate(order.created_at, locale)}
            </Link>
            <OrderCodes
              hasCodes
              names={
                new Map(
                  order.order_items.map((item) => [
                    item.id,
                    localized(item, "name", locale),
                  ])
                )
              }
              orderId={order.id}
            />
          </section>
        ))}
      </div>
    </>
  );
};

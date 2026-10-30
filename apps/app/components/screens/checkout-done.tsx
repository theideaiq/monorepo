"use client";

import { bulbsToEarn, formatPrice, localized } from "@repo/commerce";
import { Bulb } from "@repo/design-system/components/brand/bulb";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CheckCircle2Icon, ClockIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { CheckoutSteps } from "@/components/store/checkout-steps";
import { useMyBulbs } from "@/lib/bulbs-queries";
import {
  hasPendingCheckout,
  reportCompletedCheckout,
} from "@/lib/checkout-tracking";
import { orderPath, rememberedBulbsToEarn } from "@/lib/order-checkout";
import { useOrder, useOrderPayments } from "@/lib/store-queries";

const POLL_MS = 3000;
const POLL_FOR_MS = 2 * 60_000;

/**
 * Checkout's Done: the order (its number, what's in it and the total),
 * the Bulbs it earns once delivered, and one next step. Back from the
 * payment page, the order is polled until the payment is confirmed, and
 * the purchase is reported then.
 */
export const CheckoutDone = ({ orderId }: { readonly orderId: string }) => {
  const t = useTranslations("app.checkout.done");
  const tCommon = useTranslations("app.common");
  const locale = useLocale() as Locale;
  const [since] = useState<number | null>(() =>
    hasPendingCheckout() ? Date.now() : null
  );
  const [now, setNow] = useState(() => Date.now());
  const watching = since !== null && now - since < POLL_FOR_MS;
  const first = useOrder(orderId);
  const waiting = first.data?.status === "pending";
  const poll = watching && (waiting || first.isPending) ? POLL_MS : false;
  const order = useOrder(orderId, poll);
  const payments = useOrderPayments(orderId, poll);
  const rate = useMyBulbs().data?.rate;
  const [remembered] = useState(() => rememberedBulbsToEarn(orderId));

  useEffect(() => {
    if (!watching) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(timer);
  }, [watching]);

  useEffect(() => {
    if (payments.data) {
      reportCompletedCheckout(payments.data);
    }
  }, [payments.data]);

  const { data } = order;
  const pending = data?.status === "pending";
  const earned =
    remembered ??
    (data && rate !== undefined
      ? bulbsToEarn(data.total - data.shipping_fee, Number(rate))
      : 0);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-2xl flex-1 flex-col gap-6">
        <CheckoutSteps current="done" />
        {order.isPending ? <SectionSpinner /> : null}
        {order.isError ? <ErrorState onRetry={() => order.refetch()} /> : null}
        {order.isSuccess && !data ? (
          <p className="text-muted-foreground" role="status">
            {t("notFound")}
          </p>
        ) : null}
        {data ? (
          <>
            <div className="flex items-start gap-3" role="status">
              {pending ? (
                <ClockIcon
                  aria-hidden="true"
                  className="mt-1 size-6 shrink-0 text-muted-foreground"
                />
              ) : (
                <CheckCircle2Icon
                  aria-hidden="true"
                  className="mt-1 size-6 shrink-0 text-success"
                />
              )}
              <div className="grid gap-1">
                <h2 className="font-bold text-2xl">
                  {pending ? t("waiting") : t("thanks")}
                </h2>
                <p className="text-muted-foreground">
                  {tCommon("orderNumber", { number: String(data.number) })}
                </p>
              </div>
            </div>
            <ul className="divide-y rounded-2xl border bg-card">
              {data.order_items.map((item) => (
                <li
                  className="flex justify-between gap-3 p-3 text-sm"
                  key={item.id}
                >
                  <span className="min-w-0 truncate">
                    {localized(item, "name", locale)}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    × {formatNumber(item.quantity, locale)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 p-3 font-semibold">
                <span>{t("total")}</span>
                <span className="font-mono">
                  {formatPrice(data.total, locale)}
                </span>
              </li>
            </ul>
            {earned > 0 ? (
              <p className="flex items-center gap-2 text-sm">
                <Bulb aria-hidden="true" className="size-5 text-bulb-yellow" />
                {t("bulbs", { bulbs: formatNumber(earned, locale) })}
              </p>
            ) : null}
            <Button asChild className="self-start" size="lg">
              <Link href={orderPath(data.id)}>
                {pending ? t("pay") : t("track")}
              </Link>
            </Button>
          </>
        ) : null}
      </div>
    </>
  );
};

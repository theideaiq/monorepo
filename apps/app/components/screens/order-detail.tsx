"use client";

import { formatPhone } from "@repo/auth/phone";
import { describeAttributes, formatPrice, localized } from "@repo/commerce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { cn } from "@repo/design-system/lib/utils";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getPurchasePolicy } from "@repo/payments";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderStatusBadge } from "@/components/store/order-status-badge";
import { OrderSummary } from "@/components/store/order-summary";
import { governorateName, type ShippingAddress } from "@/lib/address";
import {
  hasPendingCheckout,
  reportCompletedCheckout,
} from "@/lib/checkout-tracking";
import { toCheckoutError } from "@/lib/errors";
import { usePayOrder } from "@/lib/order-checkout";
import { orderProgress, progressSteps } from "@/lib/orders";
import { detectPlatform } from "@/lib/platform";
import {
  useCancelOrder,
  useOrder,
  useOrderPayments,
} from "@/lib/store-queries";

const POLL_MS = 3000;
/** Stop waiting for the payment webhook after this long. */
const POLL_FOR_MS = 10 * 60_000;

type Order = NonNullable<ReturnType<typeof useOrder>["data"]>;

const Steps = ({ status }: { readonly status: Order["status"] }) => {
  const t = useTranslations("store.orderStatus");
  const reached = orderProgress(status);

  return (
    <ol className="grid gap-3 sm:grid-cols-5 sm:gap-2">
      {progressSteps.map((step, index) => {
        const done = index <= reached;
        return (
          <li
            aria-current={index === reached ? "step" : undefined}
            className="flex items-center gap-2 sm:flex-col sm:text-center"
            key={step}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              )}
            >
              {done ? <CheckIcon className="size-4" /> : null}
            </span>
            <span
              className={cn(
                "text-sm",
                done ? "font-medium" : "text-muted-foreground"
              )}
            >
              {t(step)}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const Address = ({ address }: { readonly address: ShippingAddress }) => {
  const locale = useLocale();
  return (
    <address className="grid gap-0.5 text-sm not-italic">
      <span className="font-medium">{address.full_name}</span>
      <span className="text-start" dir="ltr">
        {formatPhone(address.phone)}
      </span>
      <span>
        {[governorateName(address.governorate, locale), address.city]
          .filter(Boolean)
          .join(locale === "ar" ? "، " : ", ")}
      </span>
      <span className="whitespace-pre-line">{address.address}</span>
      {address.notes ? (
        <span className="text-muted-foreground">{address.notes}</span>
      ) : null}
    </address>
  );
};

const CancelOrder = ({ orderId }: { readonly orderId: string }) => {
  const t = useTranslations("app.orders.detail");
  const cancel = useCancelOrder();

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={cancel.isPending} variant="outline">
            {cancel.isPending ? t("cancelling") : t("cancel")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cancelDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancel.mutate(orderId)}>
              {t("cancelConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {cancel.isError ? (
        <p className="basis-full text-destructive text-sm" role="alert">
          {t("cancelFailed")}
        </p>
      ) : null}
    </>
  );
};

/** What is happening with the order: payment, cancellation, refund. */
const OrderNotices = ({
  justPaid,
  order,
  watching,
}: {
  readonly justPaid: boolean;
  readonly order: Order;
  readonly watching: boolean;
}) => {
  const t = useTranslations("app.orders.detail");
  const muted = "rounded-md bg-muted p-4 text-sm";

  if (justPaid || (watching && order.paid_at)) {
    return (
      <p
        className="rounded-md bg-emerald-500/10 p-4 text-emerald-700 text-sm dark:text-emerald-300"
        role="status"
      >
        {t("thanks")}
      </p>
    );
  }
  switch (order.status) {
    case "pending":
      return watching ? (
        <p className={muted} role="status">
          {t("confirming")}
        </p>
      ) : (
        <p className={muted}>{t("pendingNotice")}</p>
      );
    case "cancelled":
      return <p className={muted}>{t("cancelledNotice")}</p>;
    case "refunded":
      return <p className={muted}>{t("refundedNotice")}</p>;
    default:
      return null;
  }
};

const OrderView = ({
  order,
  watching,
  onPay,
  justPaid,
}: {
  readonly justPaid: boolean;
  readonly onPay: () => void;
  readonly order: Order;
  readonly watching: boolean;
}) => {
  const t = useTranslations("app.orders.detail");
  const tCheckout = useTranslations("app.checkout.errors");
  const locale = useLocale();
  const pay = usePayOrder();
  const policy = getPurchasePolicy(detectPlatform());
  const pending = order.status === "pending";
  const address = order.shipping_address as unknown as ShippingAddress;
  const total = formatPrice(order.total, locale);

  return (
    <div className="grid gap-6">
      <OrderNotices justPaid={justPaid} order={order} watching={watching} />

      {pending ? (
        <div className="flex flex-wrap gap-3">
          {policy.allowed ? (
            <Button
              disabled={pay.isPending}
              onClick={() => pay.mutate(order, { onSuccess: onPay })}
            >
              {pay.isPending ? t("paying") : t("payNow", { amount: total })}
            </Button>
          ) : null}
          <CancelOrder orderId={order.id} />
          {pay.isError ? (
            <p className="basis-full text-destructive text-sm" role="alert">
              {tCheckout(toCheckoutError(pay.error))}
            </p>
          ) : null}
        </div>
      ) : null}

      {orderProgress(order.status) >= 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("progress")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Steps status={order.status} />
            {order.tracking_number ? (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("tracking")}: </span>
                <span className="font-mono" dir="ltr">
                  {order.tracking_number}
                </span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader>
            <CardTitle>{t("items")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {order.order_items.map((item) => (
                <li
                  className="flex justify-between gap-4 py-3 text-sm"
                  key={item.id}
                >
                  <span className="grid min-w-0 gap-0.5">
                    <span>{localized(item, "name", locale)}</span>
                    {describeAttributes(item.attributes) ? (
                      <span className="text-muted-foreground text-xs">
                        {describeAttributes(item.attributes)}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {formatPrice(item.unit_price, locale)} ×{" "}
                      {formatNumber(item.quantity, locale)}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatPrice(item.unit_price * item.quantity, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <OrderSummary
                shippingFee={order.shipping_fee}
                subtotal={order.subtotal}
                total={order.total}
              />
              {order.paid_at ? (
                <p className="text-muted-foreground text-xs">
                  {t("paidOn", { date: formatDate(order.paid_at, locale) })}
                </p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("address")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Address address={address} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

/**
 * /orders/view?id=… — also where the payment page returns to. While a
 * remembered checkout waits, the order and its payments are polled and the
 * purchase is reported once the payment is confirmed.
 */
export const OrderDetail = () => {
  const t = useTranslations("app");
  const locale = useLocale();
  const orderId = useSearchParams().get("id") ?? "";
  const [watchSince, setWatchSince] = useState<number | null>(() =>
    hasPendingCheckout() ? Date.now() : null
  );
  const [justPaid, setJustPaid] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const watching = watchSince !== null && now - watchSince < POLL_FOR_MS;
  const firstLoad = useOrder(orderId);
  const pending = firstLoad.data?.status === "pending";
  const poll = watching && (pending || firstLoad.isPending) ? POLL_MS : false;
  const order = useOrder(orderId, poll);
  const payments = useOrderPayments(orderId, poll);

  // Keeps the poll window moving (and ends it after POLL_FOR_MS).
  useEffect(() => {
    if (!watching) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now()), POLL_MS);
    return () => clearInterval(timer);
  }, [watching]);

  useEffect(() => {
    if (payments.data && reportCompletedCheckout(payments.data)) {
      setJustPaid(true);
    }
  }, [payments.data]);

  const { data } = order;

  return (
    <>
      <PageHeader title={t("orders.title")} />
      <div className="flex max-w-5xl flex-1 flex-col gap-6 p-4 pt-0">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/orders"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("orders.detail.back")}
        </Link>
        {orderId && order.isPending ? <SectionSpinner /> : null}
        {order.isError ? <ErrorState onRetry={() => order.refetch()} /> : null}
        {!orderId || data === null ? (
          <p className="text-muted-foreground">{t("orders.detail.notFound")}</p>
        ) : null}
        {data ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-semibold text-xl tracking-tight">
                {t("common.orderNumber", { number: String(data.number) })}
              </h2>
              <OrderStatusBadge status={data.status} />
              <span className="text-muted-foreground text-sm">
                {t("orders.placed", {
                  date: formatDate(data.created_at, locale),
                })}
              </span>
            </div>
            <OrderView
              justPaid={justPaid}
              onPay={() => {
                setWatchSince(Date.now());
                setNow(Date.now());
              }}
              order={data}
              watching={watching}
            />
          </>
        ) : null}
      </div>
    </>
  );
};

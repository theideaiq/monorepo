"use client";

import { formatPhone } from "@repo/auth/phone";
import {
  type Fulfilment,
  formatPrice,
  localized,
  type PaymentMethod,
  variantName,
} from "@repo/commerce";
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
import { ArrowLeftIcon, CheckIcon, LifeBuoyIcon } from "lucide-react";
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
import {
  orderProgress,
  paymentMessageKey,
  statusMessageKey,
  stepsFor,
} from "@/lib/orders";
import {
  useCancelOrder,
  useOrder,
  useOrderPayments,
  useStoreSettings,
} from "@/lib/store-queries";
import { useCanSellDigitalGoods } from "@/lib/use-digital-checkout";

const POLL_MS = 3000;
/** Stop waiting for the payment webhook after this long. */
const POLL_FOR_MS = 10 * 60_000;

type Order = NonNullable<ReturnType<typeof useOrder>["data"]>;

const Steps = ({ order }: { readonly order: Order }) => {
  const t = useTranslations("store");
  const steps = stepsFor(order.payment_method);
  const reached = orderProgress(order.status, order.payment_method);

  return (
    <ol
      className={cn(
        "grid gap-3 sm:gap-2",
        steps.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-5"
      )}
    >
      {steps.map((step, index) => {
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
              {t(statusMessageKey(step, order.fulfilment))}
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

const CancelOrder = ({
  cash,
  orderId,
}: {
  readonly cash: boolean;
  readonly orderId: string;
}) => {
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
              {t(cash ? "cancelCashDescription" : "cancelDescription")}
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
  const locale = useLocale();
  const muted = "rounded-md bg-muted p-4 text-sm";
  const amount = formatPrice(order.total, locale);
  const pickup = order.fulfilment === "pickup";

  if (justPaid || (watching && order.paid_at)) {
    return (
      <p
        className="rounded-md bg-success/10 p-4 text-sm text-success"
        role="status"
      >
        {t("thanks")}
      </p>
    );
  }
  if (order.guardian_status === "pending" && order.status === "pending") {
    return <p className={muted}>{t("guardianPending")}</p>;
  }
  if (order.guardian_status === "declined") {
    return <p className={muted}>{t("guardianDeclined")}</p>;
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
    case "confirmed":
      return (
        <p className={muted}>
          {t(pickup ? "confirmedPickupNotice" : "confirmedNotice", { amount })}
        </p>
      );
    case "shipped":
      return pickup ? <p className={muted}>{t("readyNotice")}</p> : null;
    case "cancelled":
      return <p className={muted}>{t("cancelledNotice")}</p>;
    case "refunded":
      return <p className={muted}>{t("refundedNotice")}</p>;
    default:
      return null;
  }
};

/** Delivery or pickup (with the store's address), and how it's paid. */
const MethodCard = ({
  fulfilment,
  paymentMethod,
}: {
  readonly fulfilment: Fulfilment;
  readonly paymentMethod: PaymentMethod;
}) => {
  const t = useTranslations("app.orders.detail");
  const tStore = useTranslations("store");
  const locale = useLocale();
  const settings = useStoreSettings();
  const pickup = fulfilment === "pickup" ? settings.data?.pickup : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("method")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p className="font-medium">{tStore(`fulfilment.${fulfilment}`)}</p>
        <p>
          {tStore(
            `paymentMethod.${paymentMessageKey(paymentMethod, fulfilment)}`
          )}
        </p>
        {pickup ? (
          <dl className="grid gap-2 pt-2">
            <div className="grid gap-0.5">
              <dt className="text-muted-foreground">{t("pickupAt")}</dt>
              <dd className="whitespace-pre-line">
                {localized(pickup, "address", locale)}
              </dd>
            </div>
            {localized(pickup, "hours", locale) ? (
              <div className="grid gap-0.5">
                <dt className="text-muted-foreground">{t("pickupHours")}</dt>
                <dd className="whitespace-pre-line">
                  {localized(pickup, "hours", locale)}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </CardContent>
    </Card>
  );
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
  const conditions = useTranslations("store.condition");
  const boxText = useTranslations("web.store.product.box");
  const tCheckout = useTranslations("app.checkout.errors");
  const locale = useLocale();
  const pay = usePayOrder();
  const canSell = useCanSellDigitalGoods();
  const pending = order.status === "pending";
  // A teen's order is paid once their guardian approves it.
  const payable = pending && order.guardian_status !== "pending";
  const cash = order.payment_method === "cash_on_delivery";
  const cancellable = pending || (cash && order.status === "confirmed");
  const address = order.shipping_address as unknown as ShippingAddress;
  const total = formatPrice(order.total, locale);

  return (
    <div className="grid gap-6">
      <OrderNotices justPaid={justPaid} order={order} watching={watching} />

      {cancellable ? (
        <div className="flex flex-wrap gap-3">
          {payable && !cash && canSell === true ? (
            <Button
              disabled={pay.isPending}
              onClick={() => pay.mutate(order, { onSuccess: onPay })}
            >
              {pay.isPending ? t("paying") : t("payNow", { amount: total })}
            </Button>
          ) : null}
          <CancelOrder cash={cash} orderId={order.id} />
          {pay.isError ? (
            <p className="basis-full text-destructive text-sm" role="alert">
              {tCheckout(toCheckoutError(pay.error))}
            </p>
          ) : null}
        </div>
      ) : null}

      {orderProgress(order.status, order.payment_method) >= 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("progress")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Steps order={order} />
            {order.tracking_number ? (
              <p className="text-sm">
                <span className="text-muted-foreground">{t("tracking")}: </span>
                <span className="font-mono" dir="ltr">
                  {order.tracking_number}
                </span>
              </p>
            ) : null}
            {order.tracking_url?.startsWith("https://") ? (
              <a
                className="font-medium text-pink-text text-sm hover:underline"
                href={order.tracking_url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("trackParcel")}
              </a>
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
                    {variantName(
                      { ...item.variant, attributes: item.attributes },
                      locale
                    ) ? (
                      <span className="text-muted-foreground text-xs">
                        {variantName(
                          { ...item.variant, attributes: item.attributes },
                          locale
                        )}
                      </span>
                    ) : null}
                    {item.condition && item.condition !== "new" ? (
                      <span className="text-muted-foreground text-xs">
                        {conditions(item.condition)}
                      </span>
                    ) : null}
                    {item.box_theme ? (
                      <span className="text-muted-foreground text-xs">
                        {boxText("themeLine", {
                          theme: localized(item.box_theme, "name", locale),
                        })}
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
                bulbsDiscount={order.bulbs_discount}
                bulbsUsed={order.bulbs_used}
                discount={order.discount}
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
          <MethodCard
            fulfilment={order.fulfilment}
            paymentMethod={order.payment_method}
          />
          <Card>
            <CardHeader>
              <CardTitle>
                {order.fulfilment === "pickup" ? t("contact") : t("address")}
              </CardTitle>
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

interface OrderDetailProps {
  readonly orderId: string;
}

/**
 * /orders/<id> — also where the payment page returns to. While a
 * remembered checkout waits, the order and its payments are polled and the
 * purchase is reported once the payment is confirmed.
 */
export const OrderDetail = ({ orderId }: OrderDetailProps) => {
  const t = useTranslations("app");
  const locale = useLocale();
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
      <div className="flex max-w-5xl flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/pass/orders"
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
              <Link
                className="inline-flex items-center gap-1 text-pink-text text-sm hover:underline sm:ms-auto"
                href={{
                  pathname: "/help/new",
                  query: { order: data.id, topic: "order" },
                }}
              >
                <LifeBuoyIcon className="size-4" />
                {t("orders.detail.help")}
              </Link>
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

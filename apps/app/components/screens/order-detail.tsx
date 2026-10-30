"use client";

import { formatPhone } from "@repo/auth/phone";
import { useAuth } from "@repo/auth/provider";
import {
  type Fulfilment,
  formatPrice,
  HOUSE_SELLER_ID,
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
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  CircleCheckIcon,
  CircleXIcon,
  ClockIcon,
  LifeBuoyIcon,
  PackageIcon,
  ReceiptIcon,
  TruckIcon,
  Undo2Icon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useState } from "react";
import { Dock } from "@/components/dock";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderCodes } from "@/components/store/digital-codes";
import { GiftOrderCard } from "@/components/store/gift-order";
import { OrderReturns, ReturnLine } from "@/components/store/order-returns";
import { OrderSummary } from "@/components/store/order-summary";
import { productHref } from "@/components/store/product-card";
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
import { unwrap } from "@/lib/queries";
import {
  type OrderReturn,
  returnedQuantity,
  useOrderReturns,
} from "@/lib/return-queries";
import {
  useCancelOrder,
  useOrder,
  useOrderPayments,
} from "@/lib/store-queries";
import { useCanSellDigitalGoods } from "@/lib/use-digital-checkout";

const POLL_MS = 3000;
/** Stop waiting for the payment webhook after this long. */
const POLL_FOR_MS = 10 * 60_000;

type Order = NonNullable<ReturnType<typeof useOrder>["data"]>;

/** The icon for the order's state, beside its word. */
const STATE_ICONS: Partial<Record<Order["status"], typeof CircleCheckIcon>> = {
  cancelled: CircleXIcon,
  delivered: CircleCheckIcon,
  pending: ClockIcon,
  refunded: CircleXIcon,
  shipped: TruckIcon,
};

/**
 * The order's state in words ("On the way") with its icon, then a thin
 * progress line of its steps (the step names under it on wider screens).
 */
const OrderState = ({ order }: { readonly order: Order }) => {
  const t = useTranslations("store");
  const steps = stepsFor(order.payment_method);
  const reached = orderProgress(order.status, order.payment_method);
  const Icon = STATE_ICONS[order.status] ?? PackageIcon;

  return (
    <div className="grid gap-3">
      <p className="flex items-center gap-2 font-semibold text-lg">
        <Icon aria-hidden="true" className="size-5 text-pink-text" />
        {t(statusMessageKey(order.status, order.fulfilment))}
      </p>
      {reached >= 0 ? (
        <ol className="flex gap-1">
          {steps.map((step, index) => (
            <li
              aria-current={index === reached ? "step" : undefined}
              className="grid flex-1 gap-1.5"
              key={step}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 rounded-full",
                  index <= reached ? "bg-primary" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  index <= reached ? "font-medium" : "text-muted-foreground"
                )}
              >
                {t(statusMessageKey(step, order.fulfilment))}
              </span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
};

/** The products an order's lines came from, for Review and Buy again. */
const useLineProducts = (productIds: readonly string[]) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: productIds.length > 0,
    queryFn: async () =>
      new Map(
        (
          unwrap(
            await supabase
              .from("products")
              .select("id, slug, status")
              .in("id", [...productIds])
          ) ?? []
        ).map((row) => [row.id, row])
      ),
    queryKey: ["order-products", ...productIds],
    staleTime: 5 * 60_000,
  });
};

/**
 * The phone dock's actions by the order's state: Pay while it waits for
 * payment, Track while on the way, Review and Buy again once delivered,
 * Buy again once cancelled.
 */
const OrderDock = ({
  onPay,
  order,
}: {
  readonly onPay: () => void;
  readonly order: Order;
}) => {
  const t = useTranslations("app.orders.detail");
  const tCheckout = useTranslations("app.checkout.errors");
  const locale = useLocale();
  const pay = usePayOrder();
  const canSell = useCanSellDigitalGoods();
  const ids = [
    ...new Set(
      order.order_items
        .map((item) => item.product_id)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const products = useLineProducts(ids).data;
  const first = ids
    .map((id) => products?.get(id))
    .find((product) => product?.status === "active");
  const cash = order.payment_method === "cash_on_delivery";
  const payable =
    order.status === "pending" &&
    order.guardian_status !== "pending" &&
    !cash &&
    canSell === true;
  const track =
    order.status === "shipped" && order.tracking_url?.startsWith("https://")
      ? order.tracking_url
      : null;
  const ended = ["cancelled", "delivered", "refunded"].includes(order.status);

  if (!(payable || track || (ended && first))) {
    return null;
  }
  return (
    <Dock>
      {order.status === "delivered" && first ? (
        <Button asChild variant="outline">
          <Link href={`${productHref(first.slug)}#reviews`}>{t("review")}</Link>
        </Button>
      ) : null}
      {ended && first ? (
        <Button asChild>
          <Link href={productHref(first.slug)}>{t("buyAgain")}</Link>
        </Button>
      ) : null}
      {track ? (
        <Button asChild>
          <a href={track} rel="noopener noreferrer" target="_blank">
            {t("track")}
          </a>
        </Button>
      ) : null}
      {payable ? (
        <Button
          disabled={pay.isPending}
          onClick={() => pay.mutate(order, { onSuccess: onPay })}
        >
          {pay.isPending
            ? t("paying")
            : t("payNow", { amount: formatPrice(order.total, locale) })}
        </Button>
      ) : null}
      {pay.isError ? (
        <p className="basis-full text-destructive text-sm" role="alert">
          {tCheckout(toCheckoutError(pay.error))}
        </p>
      ) : null}
    </Dock>
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

/** Where it goes; for a gift, only the area (the address is theirs). */
const AddressCard = ({
  address,
  order,
}: {
  readonly address: ShippingAddress;
  readonly order: Order;
}) => {
  const t = useTranslations("app.orders.detail");
  const locale = useLocale();
  // Nothing delivered (program installments, digital codes): no address.
  if (!(order.is_gift || address.address)) {
    return null;
  }
  let body: ReactNode = <Address address={address} />;
  if (order.is_gift) {
    body = (
      <p className="text-sm">
        {t("giftAddress", {
          area: governorateName(address.governorate, locale),
        })}
      </p>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {order.fulfilment === "pickup" ? t("contact") : t("address")}
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
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

  if (justPaid || (watching && order.paid_at)) {
    return (
      <p
        className="rounded-md border border-success/30 bg-success/10 p-4 text-foreground text-sm"
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
      return <p className={muted}>{t("confirmedNotice", { amount })}</p>;
    case "cancelled":
      return <p className={muted}>{t("cancelledNotice")}</p>;
    case "refunded":
      return <p className={muted}>{t("refundedNotice")}</p>;
    default:
      return null;
  }
};

/** Delivery (or, on past orders, pickup) and how it's paid. */
const MethodCard = ({
  fulfilment,
  paymentMethod,
}: {
  readonly fulfilment: Fulfilment;
  readonly paymentMethod: PaymentMethod;
}) => {
  const t = useTranslations("app.orders.detail");
  const tStore = useTranslations("store");

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
      </CardContent>
    </Card>
  );
};

/** A line's total and, on a delivered order, its Return button. */
const LineAside = ({
  item,
  orderId,
  returns,
}: {
  readonly item: Order["order_items"][number];
  readonly orderId: string;
  readonly returns: readonly OrderReturn[] | undefined;
}) => {
  const locale = useLocale();
  const left = returns ? item.quantity - returnedQuantity(returns, item.id) : 0;
  return (
    <span className="grid shrink-0 justify-items-end gap-2">
      <span className="tabular-nums">
        {formatPrice(item.unit_price * item.quantity, locale)}
      </span>
      {left > 0 ? (
        <ReturnLine
          available={left}
          lineId={item.id}
          name={localized(item, "name", locale)}
          orderId={orderId}
        />
      ) : null}
    </span>
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
  const soldBy = useTranslations("app.store.product");
  const locale = useLocale();
  const pending = order.status === "pending";
  const cash = order.payment_method === "cash_on_delivery";
  const cancellable = pending || (cash && order.status === "confirmed");
  const address = order.shipping_address as unknown as ShippingAddress;
  const returns = useOrderReturns(order.id, order.status === "delivered");
  const names = new Map(
    order.order_items.map((item) => [item.id, localized(item, "name", locale)])
  );

  return (
    <div className="grid gap-6">
      <OrderState order={order} />
      {order.tracking_number ? (
        <p className="text-sm">
          <span className="text-muted-foreground">{t("tracking")}: </span>
          <span className="font-mono" dir="ltr">
            {order.tracking_number}
          </span>
        </p>
      ) : null}

      <OrderNotices justPaid={justPaid} order={order} watching={watching} />

      {order.is_gift ? (
        <GiftOrderCard orderId={order.id} status={order.status} />
      ) : null}

      <OrderCodes
        hasCodes={order.order_items.some((item) => item.kind === "digital")}
        names={names}
        orderId={order.id}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="order-items" className="grid gap-2">
          <h2 className="font-semibold" id="order-items">
            {t("items")}
          </h2>
          <ul className="divide-y rounded-lg border bg-card px-4">
            {order.order_items.map((item) => {
              const details = [
                variantName(
                  { ...item.variant, attributes: item.attributes },
                  locale
                ),
                item.condition && item.condition !== "new"
                  ? conditions(item.condition)
                  : "",
                item.seller_name && item.seller_id !== HOUSE_SELLER_ID
                  ? soldBy("soldBy", { seller: item.seller_name })
                  : "",
                item.quantity > 1
                  ? `${formatNumber(item.quantity, locale)} × ${formatPrice(item.unit_price, locale)}`
                  : "",
              ].filter(Boolean);
              return (
                <li
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                  key={item.id}
                >
                  <span className="min-w-0">
                    <span className="font-medium">
                      {localized(item, "name", locale)}
                    </span>
                    {details.length > 0 ? (
                      <span className="text-muted-foreground text-xs">
                        {" · "}
                        {details.join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  <LineAside
                    item={item}
                    orderId={order.id}
                    returns={returns.data}
                  />
                </li>
              );
            })}
          </ul>
        </section>
        <div className="grid gap-6">
          <OrderReturns
            names={names}
            orderId={order.id}
            returns={returns.data ?? []}
          />
          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <OrderSummary
                bulbsDiscount={order.bulbs_discount}
                bulbsUsed={order.bulbs_used}
                discount={order.discount}
                discountSource={order.discount_source}
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
          <AddressCard address={address} order={order} />
        </div>
      </div>
      {cancellable ? (
        <div className="flex flex-wrap gap-3 border-t pt-6">
          <CancelOrder cash={cash} orderId={order.id} />
        </div>
      ) : null}
      <OrderDock onPay={onPay} order={order} />
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
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <h2 className="font-mono font-semibold text-xl tracking-tight">
                {t("common.orderNumber", { number: String(data.number) })}
              </h2>
              <span className="text-muted-foreground text-sm">
                {t("orders.placed", {
                  date: formatDate(data.created_at, locale),
                })}
              </span>
              <nav
                aria-label={t("orders.detail.links")}
                className="flex flex-wrap items-center gap-x-4 sm:ms-auto"
              >
                {data.status === "delivered" ? (
                  <a
                    className="inline-flex min-h-11 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
                    href="#order-items"
                  >
                    <Undo2Icon aria-hidden="true" className="size-4" />
                    {t("orders.detail.return")}
                  </a>
                ) : null}
                <Link
                  className="inline-flex min-h-11 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
                  href={{
                    pathname: "/help/new",
                    query: { order: data.id, topic: "order" },
                  }}
                >
                  <LifeBuoyIcon aria-hidden="true" className="size-4" />
                  {t("orders.detail.helpShort")}
                </Link>
                {data.paid_at ? (
                  <button
                    className="inline-flex min-h-11 items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
                    onClick={() => window.print()}
                    type="button"
                  >
                    <ReceiptIcon aria-hidden="true" className="size-4" />
                    {t("orders.detail.receipt")}
                  </button>
                ) : null}
              </nav>
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

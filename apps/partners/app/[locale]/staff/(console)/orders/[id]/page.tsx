import { localized, variantName } from "@repo/commerce";
import type { OrderStatus, Tables } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { governorateName, parseAddress } from "@/lib/admin/address";
import { type Formatters, formatters } from "@/lib/admin/format";
import {
  canCollectCash,
  nextOrderStatuses,
  type UnpaidCash,
} from "@/lib/admin/fulfilment";
import { isUuid } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { markCashCollected, setOrderStatus } from "../actions";
import { BoxyPanel } from "./boxy-panel";
import { OrderNotesForm } from "./order-notes-form";

/** Orders ready to go out with Boxy: paid online, or cash orders confirmed. */
const SENDABLE = new Set(["paid", "confirmed", "processing"]);

interface OrderPageProps {
  readonly params: Promise<{ id: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders");
  return { title: t("detail") };
};

type Translate = Awaited<ReturnType<typeof getTranslations>>;

/** Subtotal, delivery, the invite discount, Bulbs and total. */
const OrderTotals = ({
  format,
  order,
  t,
}: {
  readonly format: Formatters;
  readonly order: Tables<"orders">;
  readonly t: Translate;
}) => (
  <TableFooter>
    <TableRow>
      <TableCell colSpan={3}>{t("subtotal")}</TableCell>
      <TableCell className="text-end tabular-nums">
        {format.money(order.subtotal)}
      </TableCell>
    </TableRow>
    <TableRow>
      <TableCell colSpan={3}>{t("shipping")}</TableCell>
      <TableCell className="text-end tabular-nums">
        {format.money(order.shipping_fee)}
      </TableCell>
    </TableRow>
    {order.discount > 0 ? (
      <TableRow>
        <TableCell colSpan={3}>{t("discounts.invite")}</TableCell>
        <TableCell className="text-end tabular-nums" dir="ltr">
          −{format.money(order.discount)}
        </TableCell>
      </TableRow>
    ) : null}
    {order.bulbs_used > 0 ? (
      <TableRow>
        <TableCell colSpan={3}>
          {t("bulbs", { bulbs: format.number(order.bulbs_used) })}
        </TableCell>
        <TableCell className="text-end tabular-nums" dir="ltr">
          −{format.money(order.bulbs_discount)}
        </TableCell>
      </TableRow>
    ) : null}
    <TableRow>
      <TableCell className="font-semibold" colSpan={3}>
        {t("totalAmount")}
      </TableCell>
      <TableCell className="text-end font-semibold tabular-nums">
        {format.money(order.total)}
      </TableCell>
    </TableRow>
  </TableFooter>
);

/** Delivery or pickup, the payment method and, for delivery, where to. */
const methodDetails = ({
  address,
  locale,
  order,
  t,
  tStore,
}: {
  address: ReturnType<typeof parseAddress>;
  locale: string;
  order: {
    delivery_zone: { name_ar: string; name_en: string } | null;
    fulfilment: "delivery" | "pickup";
    payment_method: "cash_on_delivery" | "online";
  };
  t: Translate;
  tStore: Translate;
}) => {
  const pickup = order.fulfilment === "pickup";
  const payment =
    order.payment_method === "cash_on_delivery" && pickup
      ? "cash_at_pickup"
      : order.payment_method;
  const method = [
    { label: t("method"), value: tStore(`fulfilment.${order.fulfilment}`) },
    { label: t("payment"), value: tStore(`paymentMethod.${payment}`) },
  ];
  if (pickup) {
    return method;
  }
  return [
    ...method,
    {
      label: t("zone"),
      value: order.delivery_zone
        ? localized(order.delivery_zone, "name", locale)
        : governorateName(address.governorate, locale),
    },
    { label: t("city"), value: address.city || "—" },
    { label: t("address"), value: address.address },
  ];
};

/** The cash of a cash order: what's due, or when it was collected. */
const CashPanel = async ({
  canCollect,
  id,
  paidAt,
  total,
}: {
  readonly canCollect: boolean;
  readonly id: string;
  readonly paidAt: string | null;
  readonly total: number;
}) => {
  const t = await getTranslations("admin.orders.cash");
  const format = formatters(await getLocale());
  const amount = format.money(total);
  return (
    <Panel title={t("title")}>
      <p className="text-sm">
        {paidAt
          ? t("collected", { date: format.dateTime(paidAt) })
          : t("due", { amount })}
      </p>
      {canCollect ? (
        <ActionButton
          action={markCashCollected}
          confirm={{
            description: t("confirmDescription"),
            title: t("confirm", { amount }),
          }}
          fields={{ id }}
          size="default"
        >
          {t("action")}
        </ActionButton>
      ) : null}
    </Panel>
  );
};

/** The status moves staff can make; pickup orders are "ready" and "picked up". */
const MovesPanel = async ({
  moves,
  order,
  pickup,
  unpaid,
}: {
  readonly moves: OrderStatus[];
  readonly order: { id: string; status: OrderStatus };
  readonly pickup: boolean;
  readonly unpaid: UnpaidCash;
}) => {
  const t = await getTranslations("admin.orders");
  const label = (status: OrderStatus) =>
    pickup && (status === "shipped" || status === "delivered")
      ? t(`movesPickup.${status}`)
      : t(`moves.${status}`);
  return (
    <Panel description={t("fulfilmentHint")} title={t("fulfilment")}>
      <div className="flex flex-wrap gap-2">
        {moves.map((status) => (
          <ActionButton
            action={setOrderStatus}
            confirm={
              status === "cancelled" ? { title: t("cancelConfirm") } : undefined
            }
            fields={{
              cash: String(unpaid.cash),
              from: order.status,
              id: order.id,
              paid: String(unpaid.paid),
              status,
            }}
            key={status}
            size="default"
            variant={status === "cancelled" ? "outline" : "default"}
          >
            {label(status)}
          </ActionButton>
        ))}
      </div>
    </Panel>
  );
};

/** A 13–17-year-old's order: where their guardian's approval stands. */
const GuardianBadge = async ({
  status,
}: {
  readonly status: string | null;
}) => {
  if (status !== "approved" && status !== "declined" && status !== "pending") {
    return null;
  }
  const t = await getTranslations("admin.orders.guardian");
  return <Badge variant="outline">{t(status)}</Badge>;
};

const OrderPage = async ({ params }: OrderPageProps) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("orders");
  const locale = await getLocale();
  const t = await getTranslations("admin.orders");
  const tStore = await getTranslations("store");
  const tPay = await getTranslations("billing.paymentStatus");
  const format = formatters(locale);
  const showPayments = canRead(staff.role, "finance");

  const [{ data: order }, { data: items }, payments, { data: shipment }] =
    await Promise.all([
      supabase
        .from("orders")
        .select(
          "*, delivery_zone:delivery_zones (name_ar, name_en, carrier_province)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("order_items")
        .select("*, variant:product_variants (label_ar, label_en)")
        .eq("order_id", id),
      showPayments
        ? supabase
            .from("payments")
            .select(
              "id, reference_id, amount, refunded_amount, status, payment_method, paid_at, created_at"
            )
            .eq("order_id", id)
            .order("created_at", { ascending: false })
        : Promise.resolve(null),
      supabase
        .from("shipments")
        .select(
          "action_required, cash_amount, delivered_at, fee, fragile, history, pickup_id, returned_at, size, status, status_title, synced_at, tracking_code, tracking_url"
        )
        .eq("order_id", id)
        .eq("active", true)
        .maybeSingle(),
    ]);

  if (!order) {
    notFound();
  }

  const address = parseAddress(order.shipping_address);
  const pickup = order.fulfilment === "pickup";
  const unpaid = {
    cash: order.payment_method === "cash_on_delivery",
    paid: order.paid_at !== null,
  };
  // A teen's order moves once their guardian approves it.
  const movable = canWrite && order.guardian_status !== "pending";
  const moves = movable ? nextOrderStatuses(order.status, unpaid) : [];
  const collectCash = movable && canCollectCash(order.status, unpaid);

  const customerHref =
    order.user_id && canRead(staff.role, "customers")
      ? `/customers/${order.user_id}`
      : null;

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: t("title") }}
        description={format.dateTime(order.created_at)}
        title={t("orderNumber", { number: String(order.number) })}
      >
        <StatusBadge status={order.status}>
          {tStore(`orderStatus.${order.status}`)}
        </StatusBadge>
        <GuardianBadge status={order.guardian_status} />
      </PageHeader>
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Panel title={t("items")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("item")}</TableHead>
                  <TableHead className="text-end">{t("unitPrice")}</TableHead>
                  <TableHead className="text-end">{t("quantity")}</TableHead>
                  <TableHead className="text-end">{t("lineTotal")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(items ?? []).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      {item.product_id ? (
                        <Link
                          className="hover:underline"
                          href={`/catalog/products/${item.product_id}`}
                        >
                          {localized(item, "name", locale)}
                        </Link>
                      ) : (
                        localized(item, "name", locale)
                      )}
                      {variantName(
                        { ...item.variant, attributes: item.attributes },
                        locale
                      ) ? (
                        <span className="block text-muted-foreground text-xs">
                          {variantName(
                            { ...item.variant, attributes: item.attributes },
                            locale
                          )}
                        </span>
                      ) : null}
                      {item.condition && item.condition !== "new" ? (
                        <span className="block text-muted-foreground text-xs">
                          {tStore(`condition.${item.condition}`)}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(item.quantity)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(item.unit_price * item.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <OrderTotals format={format} order={order} t={t} />
            </Table>
          </Panel>

          {payments ? (
            <Panel title={t("payments")}>
              {(payments.data ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("noPayments")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("reference")}</TableHead>
                      <TableHead>{t("status")}</TableHead>
                      <TableHead>{t("paidAt")}</TableHead>
                      <TableHead className="text-end">{t("amount")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payments.data ?? []).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs" dir="ltr">
                          {payment.reference_id}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status}>
                            {tPay(payment.status)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          {format.dateTime(payment.paid_at)}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {format.money(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          {pickup ? null : (
            <BoxyPanel
              addressReady={Boolean(
                order.delivery_zone?.carrier_province && address.city.trim()
              )}
              canSend={SENDABLE.has(order.status)}
              canWrite={canWrite}
              orderId={order.id}
              shipment={shipment}
            />
          )}
          {moves.length > 0 ? (
            <MovesPanel
              moves={moves}
              order={order}
              pickup={pickup}
              unpaid={unpaid}
            />
          ) : null}

          {unpaid.cash ? (
            <CashPanel
              canCollect={collectCash}
              id={order.id}
              paidAt={order.paid_at}
              total={order.total}
            />
          ) : null}

          <Panel title={t("delivery")}>
            <DetailList
              items={[
                {
                  label: t("customer"),
                  value: customerHref ? (
                    <Link className="hover:underline" href={customerHref}>
                      {address.fullName}
                    </Link>
                  ) : (
                    address.fullName
                  ),
                },
                {
                  label: t("phone"),
                  value: (
                    <a
                      className="hover:underline"
                      dir="ltr"
                      href={`tel:${address.phone}`}
                    >
                      {address.phone}
                    </a>
                  ),
                },
                ...methodDetails({ address, locale, order, t, tStore }),
                { label: t("customerNotes"), value: address.notes || "—" },
                { label: t("paidAt"), value: format.dateTime(order.paid_at) },
              ]}
            />
          </Panel>

          <Panel title={t("notes")}>
            <OrderNotesForm
              disabled={!canWrite}
              id={order.id}
              staffNote={order.staff_note}
              trackingNumber={order.tracking_number}
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default OrderPage;

import { localized } from "@repo/commerce";
import type {
  OrderStatus,
  RentalStatus,
  SubscriptionStatus,
} from "@repo/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { DetailList, Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import type { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { setSuspended } from "../actions";

type Format = ReturnType<typeof formatters>;

interface OrderRow {
  created_at: string;
  id: string;
  number: number;
  status: OrderStatus;
  total: number;
}

export const OrdersPanel = async ({
  format,
  id,
  orders,
}: {
  readonly format: Format;
  readonly id: string;
  readonly orders: OrderRow[];
}) => {
  const t = await getTranslations("admin.customers");
  const tStore = await getTranslations("store");

  return (
    <Panel
      actions={
        <Link
          className="text-pink-text text-sm hover:underline"
          href={`/orders?customer=${id}`}
        >
          {t("allOrders")}
        </Link>
      }
      title={t("orders")}
    >
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noOrders")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("order")}</TableHead>
              <TableHead>{t("date")}</TableHead>
              <TableHead>{t("status")}</TableHead>
              <TableHead className="text-end">{t("total")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    className="font-medium hover:underline"
                    dir="ltr"
                    href={`/orders/${order.id}`}
                  >
                    #{order.number}
                  </Link>
                </TableCell>
                <TableCell>{format.date(order.created_at)}</TableCell>
                <TableCell>
                  <StatusBadge status={order.status}>
                    {tStore(`orderStatus.${order.status}`)}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-end tabular-nums">
                  {format.money(order.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Panel>
  );
};

export const RentalsPanel = async ({
  format,
  locale,
  rentals,
}: {
  readonly format: Format;
  readonly locale: Locale;
  readonly rentals: {
    due_at: string | null;
    id: string;
    name_ar: string;
    name_en: string;
    requested_at: string;
    status: RentalStatus;
  }[];
}) => {
  const t = await getTranslations("admin.customers");
  const tStore = await getTranslations("store");

  return (
    <Panel title={t("rentals")}>
      {rentals.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noRentals")}</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {rentals.map((rental) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2"
              key={rental.id}
            >
              <span>{localized(rental, "name", locale)}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                {format.date(rental.due_at ?? rental.requested_at)}
                <StatusBadge status={rental.status}>
                  {tStore(`rentalStatus.${rental.status}`)}
                </StatusBadge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export const SubscriptionsPanel = async ({
  format,
  subscriptions,
}: {
  readonly format: Format;
  readonly subscriptions: {
    cancel_at_period_end: boolean;
    current_period_end: string | null;
    id: string;
    plans: { name: string } | null;
    status: SubscriptionStatus;
  }[];
}) => {
  const t = await getTranslations("admin.customers");
  const tBilling = await getTranslations("billing.status");

  return (
    <Panel title={t("subscription")}>
      {subscriptions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noSubscription")}</p>
      ) : (
        <ul className="grid gap-3 text-sm">
          {subscriptions.map((subscription) => (
            <li className="grid gap-1" key={subscription.id}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">
                  {subscription.plans?.name ?? "—"}
                </span>
                <StatusBadge status={subscription.status}>
                  {tBilling(subscription.status)}
                </StatusBadge>
              </span>
              <span className="text-muted-foreground text-xs">
                {subscription.cancel_at_period_end
                  ? t("endsOn", {
                      date: format.date(subscription.current_period_end),
                    })
                  : t("renewsOn", {
                      date: format.date(subscription.current_period_end),
                    })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

export const SuspendButton = async ({
  bannedAt,
  id,
}: {
  readonly bannedAt: string | null;
  readonly id: string;
}) => {
  const t = await getTranslations("admin.customers");
  const suspended = Boolean(bannedAt);

  return (
    <ActionButton
      action={setSuspended}
      confirm={
        suspended
          ? { title: t("unsuspendConfirm") }
          : { description: t("suspendDescription"), title: t("suspendConfirm") }
      }
      fields={{ suspend: suspended ? "false" : "true", userId: id }}
      variant={suspended ? "outline" : "destructive"}
    >
      {suspended ? t("unsuspend") : t("suspend")}
    </ActionButton>
  );
};

const telegramName = (
  member: {
    first_name: string | null;
    id: number;
    username: string | null;
  } | null
) => {
  if (!member) {
    return "—";
  }
  return member.username
    ? `@${member.username}`
    : (member.first_name ?? member.id);
};

export const ProfilePanel = async ({
  lastPhone,
  profile,
  telegram,
}: {
  readonly lastPhone: string;
  readonly profile: {
    id: string;
    locale: string;
    marketing_opt_in: boolean;
  };
  /** Null when the role can't see Telegram members. */
  readonly telegram: {
    member: {
      first_name: string | null;
      id: number;
      username: string | null;
    } | null;
  } | null;
}) => {
  const t = await getTranslations("admin.customers");

  return (
    <Panel title={t("profile")}>
      <DetailList
        items={[
          {
            label: t("language"),
            value:
              profile.locale === "en" ? t("languages.en") : t("languages.ar"),
          },
          {
            label: t("optIn"),
            value: profile.marketing_opt_in ? t("optedIn") : t("notOptedIn"),
          },
          {
            label: t("phone"),
            value: lastPhone ? (
              <a
                className="hover:underline"
                dir="ltr"
                href={`tel:${lastPhone}`}
              >
                {lastPhone}
              </a>
            ) : (
              "—"
            ),
          },
          ...(telegram
            ? [
                {
                  label: t("telegram"),
                  value: <span dir="ltr">{telegramName(telegram.member)}</span>,
                },
              ]
            : []),
          {
            label: t("userId"),
            value: (
              <code className="break-all text-xs" dir="ltr">
                {profile.id}
              </code>
            ),
          },
        ]}
      />
    </Panel>
  );
};

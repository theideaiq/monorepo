"use client";

import { formatPrice, localized, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CalendarDaysIcon, CrownIcon, PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AboutHelpLink } from "@/components/about-help-link";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { OrderStatusBadge } from "@/components/store/order-status-badge";
import { upcomingRsvps, useMyRsvps } from "@/lib/community-queries";
import { orderPath } from "@/lib/order-checkout";
import { isActiveOrder } from "@/lib/orders";
import { isLivePlan, useRentalAllowance, useRentals } from "@/lib/plus-queries";
import { usePlans, usePlusSubscription, useProfile } from "@/lib/queries";
import { useOrders } from "@/lib/store-queries";

const WHITESPACE = /\s+/;

const ViewAll = ({ href }: { readonly href: string }) => {
  const t = useTranslations("app.common");
  return (
    <CardAction>
      <Button asChild size="sm" variant="ghost">
        <Link href={href}>{t("viewAll")}</Link>
      </Button>
    </CardAction>
  );
};

const Panel = ({
  action,
  children,
  icon,
  title,
}: {
  readonly action?: ReactNode;
  readonly children: ReactNode;
  readonly icon: ReactNode;
  readonly title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        {icon}
        {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const ActiveOrders = () => {
  const t = useTranslations("app");
  const locale = useLocale();
  const orders = useOrders();
  const active = orders.data?.filter((order) => isActiveOrder(order.status));

  return (
    <Panel
      action={<ViewAll href="/pass/orders" />}
      icon={<PackageIcon className="size-5 text-pink-text" />}
      title={t("home.orders.title")}
    >
      {orders.isPending ? <SectionSpinner className="py-6" /> : null}
      {orders.isError ? <ErrorState onRetry={() => orders.refetch()} /> : null}
      {active?.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground text-sm">
            {t("home.orders.empty")}
          </p>
          <Button asChild size="sm" variant="outline">
            <Link href="/store">{t("home.orders.browse")}</Link>
          </Button>
        </div>
      ) : null}
      {active?.length ? (
        <ul className="divide-y">
          {active.slice(0, 4).map((order) => (
            <li key={order.id}>
              <Link
                className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80"
                href={orderPath(order.id)}
              >
                <span className="grid gap-0.5">
                  <span className="font-medium text-sm">
                    {t("common.orderNumber", { number: String(order.number) })}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("home.orders.placed", {
                      date: formatDate(order.created_at, locale),
                    })}
                    {" · "}
                    {formatPrice(order.total, locale)}
                  </span>
                </span>
                <OrderStatusBadge status={order.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
};

const PlusPanel = () => {
  const t = useTranslations("app.home.plus");
  const tStatus = useTranslations("store.rentalStatus");
  const locale = useLocale();
  const subscription = usePlusSubscription();
  const plans = usePlans("plus");
  const allowance = useRentalAllowance();
  const rentals = useRentals();
  const member = isLivePlan(subscription.data?.status);
  const plan = plans.data?.find(
    (item) => item.id === subscription.data?.plan_id
  );
  const open = rentals.data?.filter((rental) =>
    ["requested", "active", "overdue"].includes(rental.status)
  );

  return (
    <Panel
      action={<ViewAll href="/plus#yours" />}
      icon={<CrownIcon className="size-5 text-pink-text" />}
      title={t("title")}
    >
      {subscription.isPending ? <SectionSpinner className="py-6" /> : null}
      {subscription.isSuccess && !member ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground text-sm">{t("none")}</p>
          <Button asChild size="sm">
            <Link href="/plus">{t("join")}</Link>
          </Button>
        </div>
      ) : null}
      {member ? (
        <div className="grid gap-4">
          <div className="grid gap-1 text-sm">
            {plan ? (
              <span className="font-medium">
                {t("member", { plan: planName(plan, locale) })}
              </span>
            ) : null}
            {subscription.data?.current_period_end ? (
              <span className="text-muted-foreground text-xs">
                {t("renews", {
                  date: formatDate(
                    subscription.data.current_period_end,
                    locale
                  ),
                })}
              </span>
            ) : null}
            {allowance.data ? (
              <span className="text-muted-foreground text-xs">
                {t("slots", {
                  free: formatNumber(allowance.data.free, locale),
                  slots: formatNumber(allowance.data.slots, locale),
                })}
              </span>
            ) : null}
          </div>
          <div className="grid gap-2">
            <span className="font-medium text-xs">{t("rentals")}</span>
            {open?.length ? (
              <ul className="grid gap-1.5 text-sm">
                {open.slice(0, 4).map((rental) => (
                  <li className="flex justify-between gap-3" key={rental.id}>
                    <span className="truncate">
                      {localized(rental, "name", locale)}
                    </span>
                    <span className="shrink-0 text-muted-foreground text-xs">
                      {rental.due_at
                        ? t("due", { date: formatDate(rental.due_at, locale) })
                        : tStatus(rental.status)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground text-sm">{t("noRentals")}</p>
            )}
          </div>
        </div>
      ) : null}
    </Panel>
  );
};

const NextEvents = () => {
  const t = useTranslations("app.home.events");
  const locale = useLocale();
  const rsvps = useMyRsvps();
  const next = rsvps.data ? upcomingRsvps(rsvps.data).slice(0, 3) : undefined;

  return (
    <Panel
      action={<ViewAll href="/club#yours" />}
      icon={<CalendarDaysIcon className="size-5 text-pink-text" />}
      title={t("title")}
    >
      {rsvps.isPending ? <SectionSpinner className="py-6" /> : null}
      {next?.length === 0 ? (
        <div className="grid justify-items-start gap-3">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
          <Button asChild size="sm" variant="outline">
            <Link href="/club?show=events#join">{t("browse")}</Link>
          </Button>
        </div>
      ) : null}
      {next?.length ? (
        <ul className="grid gap-3">
          {next.map(({ event }) => (
            <li className="grid gap-0.5 text-sm" key={event.id}>
              <span className="font-medium">
                {localized(event, "title", locale)}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(event.starts_at, locale)} · {event.location}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
};

/**
 * Your Pass: a greeting, the Pass card (`card`, rendered on the
 * server, with the Bulbs balance), then what's on the way: active orders,
 * Plus rentals and the next events. The Store has its own tab.
 */
export const Home = ({ card }: { readonly card?: ReactNode }) => {
  const t = useTranslations("app.home");
  const pass = useTranslations("pass.home");
  const profile = useProfile();
  const firstName = profile.data?.full_name?.trim().split(WHITESPACE)[0];

  return (
    <>
      <PageHeader title={pass("title")} />
      <div className="flex flex-1 flex-col gap-8">
        <div className="grid gap-1">
          <h2 className="font-semibold text-2xl tracking-tight">
            {firstName
              ? t("greeting", { name: firstName })
              : t("greetingNoName")}
          </h2>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>
        {card}
        <div className="grid gap-4 lg:grid-cols-3">
          <ActiveOrders />
          <PlusPanel />
          <NextEvents />
        </div>
        <AboutHelpLink />
      </div>
    </>
  );
};

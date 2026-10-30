"use client";

import { formatPrice, localized } from "@repo/commerce";
import { Bulb } from "@repo/design-system/components/brand/bulb";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import {
  CalendarDaysIcon,
  ChevronRightIcon,
  HouseIcon,
  InboxIcon,
  type LucideIcon,
  MoveRight,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { AboutHelpLink } from "@/components/about-help-link";
import { PageHeader } from "@/components/page-header";
import { AskToPlay } from "@/components/pass/family";
import { AvailabilityLabel } from "@/components/pass/plus-words";
import { isAtHome } from "@/components/pass/rentals";
import { OrderStatusBadge } from "@/components/store/order-status-badge";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { useMyBulbs } from "@/lib/bulbs-queries";
import { eventPath } from "@/lib/club";
import { upcomingRsvps, useMyRsvps } from "@/lib/community-queries";
import { useFamilyRequests } from "@/lib/family";
import { orderPath } from "@/lib/order-checkout";
import { type TodayItem, todayItems } from "@/lib/pass-today";
import { usePlusAvailability } from "@/lib/plus-availability";
import { useRentals } from "@/lib/plus-queries";
import { useProfile } from "@/lib/queries";
import { useQueue } from "@/lib/queue-queries";
import { sectionKey, settingsPath, settingsSections } from "@/lib/settings";
import { useOrders } from "@/lib/store-queries";

const WHITESPACE = /\s+/;
const SHELF_SIZE = 4;

/** A shelf of the Library: its title, "See all", and a few things. */
const Shelf = ({
  children,
  empty,
  href,
  title,
}: {
  readonly children: ReactNode;
  /** Shown instead of the items when there are none. */
  readonly empty: string | null;
  readonly href: string;
  readonly title: string;
}) => {
  const t = useTranslations("app.common");
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-lg">{title}</h2>
        <Link
          className="inline-flex min-h-11 items-center gap-1 font-medium text-pink-text text-sm hover:underline"
          href={href}
        >
          {t("viewAll")}
          <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>
      {empty ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
};

/** A row that opens a page: icon, label, hint and a chevron. */
const RowLink = ({
  hint,
  href,
  icon: Icon,
  label,
}: {
  readonly hint?: ReactNode;
  readonly href: string;
  readonly icon?: LucideIcon;
  readonly label: string;
}) => (
  <Link
    className="flex min-h-14 items-center gap-3 p-4 transition-colors hover:bg-muted/50"
    href={href}
  >
    {Icon ? (
      <Icon aria-hidden="true" className="size-5 shrink-0 text-pink-text" />
    ) : null}
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="font-medium text-sm">{label}</span>
      {hint ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
    </span>
    <ChevronRightIcon
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
    />
  </Link>
);

const TODAY_ICONS: Record<TodayItem["kind"], LucideIcon> = {
  delivery: TruckIcon,
  dueBack: HouseIcon,
  event: CalendarDaysIcon,
  family: InboxIcon,
};

/** Today: only shown when something is due. */
const Today = () => {
  const t = useTranslations("app.pass.today");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const orders = useOrders().data ?? [];
  const rentals = useRentals().data ?? [];
  const rsvps = useMyRsvps().data ?? [];
  const requests = useFamilyRequests().data ?? [];
  const items = todayItems({
    events: rsvps.flatMap(({ event }) =>
      event
        ? [
            {
              id: event.id,
              slug: event.slug,
              starts_at: event.starts_at,
              title: localized(event, "title", locale),
            },
          ]
        : []
    ),
    familyRequests: requests.length,
    orders,
    rentals: rentals.map((rental) => ({
      ...rental,
      name: localized(rental, "name", locale),
    })),
  });
  if (items.length === 0) {
    return null;
  }

  const row = (item: TodayItem): { href: string; label: string } => {
    switch (item.kind) {
      case "delivery":
        return {
          href: orderPath(item.id),
          label: t("delivery", {
            order: tCommon("orderNumber", { number: String(item.number) }),
          }),
        };
      case "dueBack":
        return {
          href: "/pass/at-home",
          label: item.late
            ? t("late", { name: item.name })
            : t("dueBack", {
                date: formatDate(item.dueAt, locale),
                name: item.name,
              }),
        };
      case "event":
        return {
          href: eventPath(item.slug),
          label: t("event", {
            time: formatTime(item.startsAt, locale),
            title: item.title,
          }),
        };
      default:
        return {
          href: "/pass/family",
          label: t("family", {
            count: item.count,
            n: formatNumber(item.count, locale),
          }),
        };
    }
  };

  return (
    <section aria-labelledby="pass-today" className="grid gap-3">
      <h2 className="font-semibold text-lg" id="pass-today">
        {t("title")}
      </h2>
      <ul className="divide-y rounded-lg border border-idea-pink/40 bg-card">
        {items.map((item) => {
          const { href, label } = row(item);
          return (
            <li key={`${item.kind}-${item.id}`}>
              <RowLink
                href={href}
                icon={TODAY_ICONS[item.kind]}
                label={label}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
};

const AtHomeShelf = () => {
  const t = useTranslations("app.pass.shelves");
  const tAtHome = useTranslations("app.pass.atHome");
  const locale = useLocale();
  const rentals = useRentals();
  const home = (rentals.data ?? []).filter(isAtHome);
  return (
    <Shelf
      empty={rentals.data && home.length === 0 ? t("atHomeEmpty") : null}
      href="/pass/at-home"
      title={t("atHome")}
    >
      <ul className="divide-y rounded-lg border bg-card">
        {home.slice(0, SHELF_SIZE).map((rental) => (
          <li
            className="flex justify-between gap-3 p-3 text-sm"
            key={rental.id}
          >
            <span className="truncate">
              {localized(rental, "name", locale)}
            </span>
            <span className="shrink-0 text-muted-foreground text-xs">
              {rental.due_at
                ? tAtHome("dueBack", {
                    date: formatDate(rental.due_at, locale),
                  })
                : tAtHome("onItsWay")}
            </span>
          </li>
        ))}
      </ul>
    </Shelf>
  );
};

const QueueShelf = () => {
  const t = useTranslations("app.pass.shelves");
  const locale = useLocale();
  const queue = useQueue();
  const next = queue.items.slice(0, SHELF_SIZE);
  const availability = usePlusAvailability(next.map((item) => item.product_id));
  return (
    <Shelf
      empty={queue.data && next.length === 0 ? t("queueEmpty") : null}
      href="/pass/queue"
      title={t("queue")}
    >
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {next.map((item) => {
          const name = item.product
            ? localized(item.product, "name", locale)
            : "";
          return (
            <li key={item.product_id}>
              <Link
                className="grid gap-1.5"
                href={productHref(item.product?.slug ?? "")}
              >
                <ProductImage
                  alt={name}
                  path={item.product?.images[0]}
                  sizes="(min-width: 640px) 12rem, 45vw"
                />
                <span className="line-clamp-2 font-medium text-sm">{name}</span>
                <AvailabilityLabel
                  availability={availability.get(item.product_id)}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </Shelf>
  );
};

const BoughtShelf = () => {
  const t = useTranslations("app.pass.shelves");
  const tCommon = useTranslations("app.common");
  const locale = useLocale();
  const orders = useOrders();
  const latest = (orders.data ?? []).slice(0, SHELF_SIZE);
  return (
    <Shelf
      empty={orders.data && latest.length === 0 ? t("boughtEmpty") : null}
      href="/pass/orders"
      title={t("bought")}
    >
      <ul className="divide-y rounded-lg border bg-card">
        {latest.map((order) => (
          <li key={order.id}>
            <Link
              className="flex min-h-11 items-center justify-between gap-3 p-3 hover:bg-muted/50"
              href={orderPath(order.id)}
            >
              <span className="grid min-w-0 gap-0.5">
                <span className="truncate font-medium text-sm">
                  {order.order_items
                    .map((item) => localized(item, "name", locale))
                    .join(" · ") ||
                    tCommon("orderNumber", { number: String(order.number) })}
                </span>
                <span className="font-mono text-muted-foreground text-xs">
                  {formatPrice(order.total, locale)}
                </span>
              </span>
              <OrderStatusBadge status={order.status} />
            </Link>
          </li>
        ))}
      </ul>
    </Shelf>
  );
};

const TicketsShelf = () => {
  const t = useTranslations("app.pass.shelves");
  const locale = useLocale();
  const rsvps = useMyRsvps();
  const next = rsvps.data ? upcomingRsvps(rsvps.data).slice(0, SHELF_SIZE) : [];
  return (
    <Shelf
      empty={rsvps.data && next.length === 0 ? t("ticketsEmpty") : null}
      href="/pass/tickets"
      title={t("tickets")}
    >
      <ul className="divide-y rounded-lg border bg-card">
        {next.map(({ event }) => (
          <li key={event.id}>
            <Link
              className="grid min-h-11 gap-0.5 p-3 text-sm hover:bg-muted/50"
              href={eventPath(event.slug)}
            >
              <span className="font-medium">
                {localized(event, "title", locale)}
              </span>
              <span className="text-muted-foreground text-xs">
                {formatDateTime(event.starts_at, locale)} · {event.location}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Shelf>
  );
};

/** Bulbs, Family, Settings: rows that open their pages. */
const Rows = () => {
  const t = useTranslations("app");
  const locale = useLocale();
  const bulbs = useMyBulbs().data;
  return (
    <>
      <ul className="divide-y rounded-lg border bg-card">
        <li>
          <Link
            className="flex min-h-14 items-center gap-3 p-4 transition-colors hover:bg-muted/50"
            href="/pass/bulbs"
          >
            <Bulb
              aria-hidden="true"
              className="size-5 shrink-0 text-idea-pink dark:text-bulb-yellow"
            />
            <span className="grid min-w-0 flex-1 gap-0.5">
              <span className="font-medium text-sm">{t("nav.bulbs")}</span>
              {bulbs ? (
                <span className="font-mono text-muted-foreground text-xs">
                  {t("pass.bulbs", {
                    bulbs: formatNumber(bulbs.available, locale),
                  })}
                </span>
              ) : null}
            </span>
            <ChevronRightIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground rtl:rotate-180"
            />
          </Link>
        </li>
        <li>
          <RowLink
            hint={t("pass.familyHint")}
            href="/pass/family"
            icon={UsersIcon}
            label={t("pass.family.title")}
          />
        </li>
      </ul>
      <section aria-labelledby="pass-settings" className="grid gap-3">
        <h2 className="font-semibold text-lg" id="pass-settings">
          {t("settings.title")}
        </h2>
        <ul className="divide-y rounded-lg border bg-card">
          {settingsSections.map((section) => (
            <li key={section}>
              <RowLink
                href={settingsPath(section)}
                label={t(`settings.sections.${sectionKey(section)}.title`)}
              />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

/**
 * `/pass`: the live card (`card`, rendered on the server), then Today
 * (only when something is due), the Library's shelves (At home, Up next
 * in your queue, Bought, Tickets), Bulbs, Family, Settings and About &
 * help. Each shelf opens its page.
 */
export const Home = ({ card }: { readonly card?: ReactNode }) => {
  const t = useTranslations("app.home");
  const pass = useTranslations("pass.home");
  const profile = useProfile();
  const firstName = profile.data?.full_name?.trim().split(WHITESPACE)[0];

  return (
    <>
      <PageHeader title={pass("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-8">
        <h2 className="font-semibold text-2xl tracking-tight">
          {firstName ? t("greeting", { name: firstName }) : t("greetingNoName")}
        </h2>
        {card}
        <Today />
        <AskToPlay />
        <AtHomeShelf />
        <QueueShelf />
        <BoughtShelf />
        <TicketsShelf />
        <Rows />
        <AboutHelpLink />
      </div>
    </>
  );
};

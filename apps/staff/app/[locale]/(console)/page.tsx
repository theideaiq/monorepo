import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import {
  BookOpenIcon,
  LifeBuoyIcon,
  type LucideIcon,
  MailIcon,
  PackageCheckIcon,
  RepeatIcon,
  SendIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CounterMode } from "@/components/admin/counter-mode";
import { InboxList } from "@/components/admin/inbox-list";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatCard } from "@/components/admin/stat-card";
import { monthStartIso } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { awaitingFulfilment } from "@/lib/admin/fulfilment";
import { loadInbox } from "@/lib/admin/inbox";
import {
  byWaiting,
  countByKind,
  type InboxKind,
  inboxHref,
  kindHref,
  mineOnly,
  parseInboxFilter,
  visibleKinds,
} from "@/lib/admin/inbox-kinds";
import type { SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { canRead, canWrite } from "@/lib/admin/roles";
import type { ServerClient } from "@/lib/admin/session";
import { requireSection } from "@/lib/admin/session";
import { loadInboxItems, PER_KIND } from "./_inbox/rows";
import { CheckPass } from "./customers/_components/check-pass";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.nav");
  return { title: t("dashboard") };
};

type Access = Record<
  | "customers"
  | "editorial"
  | "finance"
  | "members"
  | "orders"
  | "rentals"
  | "support"
  | "telegram",
  boolean
>;

const head = { count: "exact", head: true } as const;

/** How many weeks of key numbers the Inbox shows. */
const WEEKS = 8;

/** Kinds with an owner: the only ones "Mine" can hold. */
const OWNED: readonly InboxKind[] = ["support", "submissions"];

/** Runs a count only when the role can see it (RLS would hide it anyway). */
const countIf = async (
  allowed: boolean,
  query: () => PromiseLike<{ count: number | null }>
) => (allowed ? ((await query()).count ?? 0) : 0);

/** The key numbers, each loaded only for roles that use it. */
const loadStats = async (supabase: ServerClient, can: Access) => {
  const since = monthStartIso(new Date());

  const [
    fulfilment,
    members,
    openRentals,
    overdueRentals,
    optedIn,
    requests,
    paidOrders,
    payments,
    queue,
    openTickets,
    unassignedTickets,
  ] = await Promise.all([
    countIf(can.orders, () =>
      supabase
        .from("orders")
        .select("id", head)
        .in("status", awaitingFulfilment)
    ),
    countIf(can.members, () =>
      supabase
        .from("subscriptions")
        .select("id, plans!subscriptions_plan_id_fkey!inner(audience)", head)
        .eq("plans.audience", "plus")
        .in("status", ["active", "past_due"])
    ),
    countIf(can.rentals, () =>
      supabase
        .from("rentals")
        .select("id", head)
        .in("status", ["requested", "active"])
    ),
    countIf(can.rentals, () =>
      supabase.from("rentals").select("id", head).eq("status", "overdue")
    ),
    countIf(can.customers, () =>
      supabase
        .from("profiles")
        .select("id", head)
        .eq("marketing_opt_in", true)
        .is("banned_at", null)
    ),
    countIf(can.telegram, () =>
      supabase.from("telegram_requests").select("id", head).eq("status", "open")
    ),
    can.finance
      ? supabase
          .from("orders")
          .select("total")
          .gte("paid_at", since)
          .not("status", "in", "(cancelled,refunded)")
          .limit(10_000)
      : null,
    can.finance
      ? supabase
          .from("payments")
          .select("amount, refunded_amount")
          .eq("status", "paid")
          .gte("paid_at", since)
          .limit(10_000)
      : null,
    can.editorial ? supabase.rpc("review_queue") : null,
    countIf(can.support, () =>
      supabase.from("support_tickets").select("id", head).eq("status", "open")
    ),
    countIf(can.support, () =>
      supabase
        .from("support_tickets")
        .select("id", head)
        .eq("status", "open")
        .is("assigned_to", null)
    ),
  ]);

  return {
    fulfilment,
    members,
    openRentals: openRentals + overdueRentals,
    openTickets,
    optedIn,
    overdueRentals,
    received: (payments?.data ?? []).reduce(
      (total, row) => total + row.amount - row.refunded_amount,
      0
    ),
    requests,
    revenue: (paidOrders?.data ?? []).reduce(
      (total, row) => total + row.total,
      0
    ),
    submissions: (queue?.data ?? []).filter(
      (row) => row.status === "pending" || row.status === "under_review"
    ).length,
    unassignedTickets,
  };
};

interface Card {
  attention?: boolean;
  hint?: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  show: boolean;
  value: string;
}

/** A filter chip: the kind's name and how many wait. */
const Chip = ({
  active,
  count,
  href,
  label,
}: {
  readonly active: boolean;
  readonly count: string;
  readonly href: string;
  readonly label: string;
}) => (
  <Link
    aria-current={active ? "page" : undefined}
    className={cn(
      "inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm transition-colors",
      active
        ? "border-primary bg-primary/10 font-medium text-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-foreground"
    )}
    href={href}
  >
    {label}
    <span className="tabular-nums">{count}</span>
  </Link>
);

/**
 * The Inbox: every decision waiting on the role in one list (filtered by
 * kind, or "Mine"), each opening in a drawer with its actions; then the
 * other work with its own pages, and the key numbers.
 */
const InboxPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("dashboard");
  const filter = parseInboxFilter(await searchParams);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.dashboard");
  const format = formatters(locale);
  const { role } = staff;
  const kinds = visibleKinds(role);

  const can: Access = {
    customers: canRead(role, "customers"),
    editorial: canRead(role, "editorial"),
    finance: canRead(role, "finance"),
    members: canRead(role, "rentals") || canRead(role, "finance"),
    orders: canRead(role, "orders"),
    rentals: canRead(role, "rentals"),
    support: canRead(role, "support"),
    telegram: canRead(role, "telegram"),
  };
  // Only what the list shows: one kind, the owned kinds for Mine, or all.
  const wanted = kinds.filter(
    (kind) =>
      (!filter.kind || kind === filter.kind) &&
      (!filter.mine || OWNED.includes(kind))
  );
  const [stats, summary, loaded, { data: weeks }] = await Promise.all([
    loadStats(supabase, can),
    loadInbox(supabase, role),
    loadInboxItems(
      supabase,
      role,
      locale,
      wanted,
      filter.mine ? staff.userId : null
    ),
    supabase.rpc("staff_metrics", { weeks: WEEKS }),
  ]);

  const loadedItems = Object.values(loaded).flatMap(
    (result) => result?.items ?? []
  );
  const mineRows = mineOnly(
    loadedItems.map((item) => item.row),
    true,
    staff.userId
  );
  const mineKeys = new Set(mineRows.map((row) => row.key));
  const shownItems = (
    filter.mine
      ? loadedItems.filter((item) => mineKeys.has(item.row.key))
      : loadedItems
  ).filter((item) => !filter.kind || item.row.kind === filter.kind);
  const order = new Map(
    byWaiting(shownItems.map((item) => item.row)).map((row, index) => [
      row.key,
      index,
    ])
  );
  const items = [...shownItems].sort(
    (a, b) => (order.get(a.row.key) ?? 0) - (order.get(b.row.key) ?? 0)
  );
  // Chip counts: everything waiting (or, under Mine, what's yours).
  const counts: Record<InboxKind, number> = filter.mine
    ? countByKind(mineRows)
    : summary.decisions;
  const total = kinds.reduce((sum, kind) => sum + counts[kind], 0);
  const cut =
    filter.kind && !filter.mine
      ? (loaded[filter.kind]?.total ?? 0) > PER_KIND
      : false;

  // Paid orders out of the people who started a cart that week.
  const conversion = (paid: number, carts: number) =>
    carts > 0 ? `${format.number(Math.round((paid / carts) * 100))}%` : "—";

  const cards: Card[] = [
    {
      attention: stats.openTickets > 0,
      hint: t("openTicketsHint", {
        unassigned: format.number(stats.unassignedTickets),
      }),
      href: "/support?status=open",
      icon: LifeBuoyIcon,
      label: t("openTickets"),
      show: can.support,
      value: format.number(stats.openTickets),
    },
    {
      attention: stats.fulfilment > 0,
      hint: t("fulfilmentHint"),
      href: "/orders?status=awaiting",
      icon: PackageCheckIcon,
      label: t("fulfilment"),
      show: can.orders,
      value: format.number(stats.fulfilment),
    },
    {
      hint: t("revenueHint", { received: format.money(stats.received) }),
      href: "/finance",
      icon: WalletIcon,
      label: t("revenue"),
      show: can.finance,
      value: format.money(stats.revenue),
    },
    {
      href: can.rentals ? "/plus/members" : undefined,
      icon: SparklesIcon,
      label: t("members"),
      show: can.members,
      value: format.number(stats.members),
    },
    {
      attention: stats.overdueRentals > 0,
      hint: t("overdue", { count: format.number(stats.overdueRentals) }),
      href: "/plus/coming-back",
      icon: RepeatIcon,
      label: t("rentals"),
      show: can.rentals,
      value: format.number(stats.openRentals),
    },
    {
      attention: stats.submissions > 0,
      href: "/club/submissions",
      icon: BookOpenIcon,
      label: t("submissions"),
      show: can.editorial,
      value: format.number(stats.submissions),
    },
    {
      href: "/customers?optIn=yes",
      icon: MailIcon,
      label: t("optedIn"),
      show: can.customers,
      value: format.number(stats.optedIn),
    },
    {
      attention: stats.requests > 0,
      href: "/club/telegram",
      icon: SendIcon,
      label: t("telegramRequests"),
      show: can.telegram,
      value: format.number(stats.requests),
    },
  ];

  return (
    <>
      <PageHeader
        description={t("greeting", { name: staff.name ?? "" })}
        title={t("title")}
      />
      <PageBody>
        {canWrite(role, "customers") ? (
          <CounterMode>
            <CheckPass />
          </CounterMode>
        ) : null}

        <section aria-labelledby="inbox-title" className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-lg" id="inbox-title">
              {t("inbox.title")}
            </h2>
            <nav
              aria-label={t("inbox.whose")}
              className="inline-flex rounded-lg border p-0.5"
            >
              {[false, true].map((mine) => (
                <Link
                  aria-current={filter.mine === mine ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-9 items-center rounded-md px-3 text-sm",
                    filter.mine === mine
                      ? "bg-accent font-medium text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  href={inboxHref({ kind: filter.kind, mine })}
                  key={String(mine)}
                >
                  {t(mine ? "inbox.mine" : "inbox.all")}
                </Link>
              ))}
            </nav>
          </div>
          <nav
            aria-label={t("inbox.kindsLabel")}
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            <Chip
              active={filter.kind === null}
              count={format.number(total)}
              href={inboxHref({ kind: null, mine: filter.mine })}
              label={t("inbox.everything")}
            />
            {kinds.map((kind) => (
              <Chip
                active={filter.kind === kind}
                count={format.number(counts[kind])}
                href={inboxHref({ kind, mine: filter.mine })}
                key={kind}
                label={t(`inbox.kinds.${kind}`)}
              />
            ))}
          </nav>
          {items.length === 0 ? (
            <EmptyState
              title={t(filter.mine ? "inbox.mineEmpty" : "inbox.empty")}
            />
          ) : (
            <InboxList items={items} now={new Date().toISOString()} />
          )}
          {cut && filter.kind ? (
            <p className="text-muted-foreground text-sm">
              {t("inbox.shown", {
                shown: format.number(PER_KIND),
                total: format.number(loaded[filter.kind]?.total ?? 0),
              })}{" "}
              <Link className="underline" href={kindHref[filter.kind]}>
                {t("inbox.seeAll")}
              </Link>
            </p>
          ) : null}
        </section>

        {summary.other.length > 0 ? (
          <Panel title={t("inbox.other")}>
            <ul className="divide-y text-sm">
              {summary.other.map((item) => (
                <li key={item.id}>
                  <Link
                    className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                    href={item.href}
                  >
                    <span>{t(`inbox.items.${item.id}`)}</span>
                    <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-pink-text tabular-nums">
                      {format.number(item.count)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel description={t("weeks.description")} title={t("weeks.title")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("weeks.week")}</TableHead>
                  <TableHead className="text-end">
                    {t("weeks.orders")}
                  </TableHead>
                  <TableHead className="text-end">{t("weeks.paid")}</TableHead>
                  <TableHead className="text-end">
                    {t("weeks.conversion")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("weeks.newPasses")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("weeks.plusJoins")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("weeks.plusCancellations")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(weeks ?? []).map((week) => (
                  <TableRow key={week.week}>
                    <TableCell className="whitespace-nowrap">
                      {format.date(week.week)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(week.orders)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(week.paid_orders)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {conversion(week.paid_orders, week.carts)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(week.new_passes)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(week.plus_joins)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(week.plus_cancellations)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Panel>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards
            .filter((card) => card.show)
            .map((card) => (
              <StatCard
                hint={card.hint}
                href={card.href}
                icon={card.icon}
                key={card.label}
                label={card.label}
                tone={card.attention ? "attention" : "default"}
                value={card.value}
              />
            ))}
        </div>
      </PageBody>
    </>
  );
};

export default InboxPage;

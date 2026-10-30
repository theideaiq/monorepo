import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
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
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatCard } from "@/components/admin/stat-card";
import { monthStartIso } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { awaitingFulfilment } from "@/lib/admin/fulfilment";
import { loadInbox } from "@/lib/admin/inbox";
import { Link } from "@/lib/admin/navigation";
import { canRead } from "@/lib/admin/roles";
import type { ServerClient } from "@/lib/admin/session";
import { requireSection } from "@/lib/admin/session";

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

/** How many weeks of key numbers the home page shows. */
const WEEKS = 8;

/** Runs a count only when the role can see it (RLS would hide it anyway). */
const countIf = async (
  allowed: boolean,
  query: () => PromiseLike<{ count: number | null }>
) => (allowed ? ((await query()).count ?? 0) : 0);

/** The dashboard's numbers, each loaded only for roles that use it. */
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

/** Today's work for the signed-in role: the inbox, then the numbers. */
const DashboardPage = async () => {
  const { staff, supabase } = await requireSection("dashboard");
  const t = await getTranslations("admin.dashboard");
  const format = formatters(await getLocale());
  const { role } = staff;

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
  const [stats, inbox, { data: weeks }] = await Promise.all([
    loadStats(supabase, can),
    loadInbox(supabase, role),
    supabase.rpc("staff_metrics", { weeks: WEEKS }),
  ]);
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
      href: can.rentals ? "/rentals?view=active" : undefined,
      icon: SparklesIcon,
      label: t("members"),
      show: can.members,
      value: format.number(stats.members),
    },
    {
      attention: stats.overdueRentals > 0,
      hint: t("overdue", { count: format.number(stats.overdueRentals) }),
      href: "/rentals",
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
        <Panel title={t("inbox.title")}>
          {inbox.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("inbox.empty")}</p>
          ) : (
            <ul className="divide-y text-sm">
              {inbox.map((item) => (
                <li key={item.id}>
                  <Link
                    className="flex items-center justify-between gap-3 py-2 hover:underline"
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
          )}
        </Panel>
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

export default DashboardPage;

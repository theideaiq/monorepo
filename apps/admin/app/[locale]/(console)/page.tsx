import {
  BookOpenIcon,
  MailIcon,
  MegaphoneIcon,
  PackageCheckIcon,
  RepeatIcon,
  SendIcon,
  SparklesIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { monthStartIso } from "@/lib/dates";
import { formatters } from "@/lib/format";
import { awaitingFulfilment } from "@/lib/fulfilment";
import { canRead } from "@/lib/roles";
import { requireSection } from "@/lib/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.nav");
  return { title: t("dashboard") };
};

const sum = (rows: { amount: number }[] | null) =>
  (rows ?? []).reduce((total, row) => total + row.amount, 0);

/** Today's work for the signed-in role. */
const DashboardPage = async () => {
  const { staff, supabase } = await requireSection("dashboard");
  const t = await getTranslations("admin.dashboard");
  const format = formatters(await getLocale());
  const role = staff.role;
  const since = monthStartIso(new Date());

  const can = {
    editorial: canRead(role, "editorial"),
    finance: canRead(role, "finance"),
    marketing: canRead(role, "marketing"),
    members: canRead(role, "rentals") || canRead(role, "finance"),
    orders: canRead(role, "orders"),
    rentals: canRead(role, "rentals"),
    telegram: canRead(role, "telegram"),
  };

  const none = Promise.resolve(null);
  const [
    fulfilment,
    paidOrders,
    payments,
    members,
    openRentals,
    overdueRentals,
    queue,
    drafts,
    optedIn,
    requests,
  ] = await Promise.all([
    can.orders
      ? supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", awaitingFulfilment)
      : none,
    can.finance
      ? supabase
          .from("orders")
          .select("amount:total")
          .gte("paid_at", since)
          .not("status", "in", "(cancelled,refunded)")
          .limit(10_000)
      : none,
    can.finance
      ? supabase
          .from("payments")
          .select("amount, refunded_amount")
          .eq("status", "paid")
          .gte("paid_at", since)
          .limit(10_000)
      : none,
    can.members
      ? supabase
          .from("subscriptions")
          .select("id, plans!inner(audience)", { count: "exact", head: true })
          .eq("plans.audience", "plus")
          .in("status", ["active", "past_due"])
      : none,
    can.rentals
      ? supabase
          .from("rentals")
          .select("id", { count: "exact", head: true })
          .in("status", ["requested", "active"])
      : none,
    can.rentals
      ? supabase
          .from("rentals")
          .select("id", { count: "exact", head: true })
          .eq("status", "overdue")
      : none,
    can.editorial ? supabase.rpc("review_queue") : none,
    can.marketing
      ? supabase
          .from("marketing_campaigns")
          .select("id", { count: "exact", head: true })
          .eq("status", "draft")
      : none,
    can.marketing
      ? supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("marketing_opt_in", true)
          .is("banned_at", null)
      : none,
    can.telegram
      ? supabase
          .from("telegram_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "open")
      : none,
  ]);

  const pendingSubmissions = (queue?.data ?? []).filter(
    (row) => row.status === "pending" || row.status === "under_review"
  ).length;
  const received = (payments?.data ?? []).reduce(
    (total, row) => total + row.amount - row.refunded_amount,
    0
  );

  return (
    <>
      <PageHeader
        description={t("greeting", { name: staff.name ?? "" })}
        title={t("title")}
      />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {can.orders ? (
            <StatCard
              hint={t("fulfilmentHint")}
              href="/orders?status=awaiting"
              icon={PackageCheckIcon}
              label={t("fulfilment")}
              tone={(fulfilment?.count ?? 0) > 0 ? "attention" : "default"}
              value={format.number(fulfilment?.count ?? 0)}
            />
          ) : null}
          {can.finance ? (
            <StatCard
              hint={t("revenueHint", { received: format.money(received) })}
              href="/finance"
              icon={WalletIcon}
              label={t("revenue")}
              value={format.money(sum(paidOrders?.data ?? null))}
            />
          ) : null}
          {can.members ? (
            <StatCard
              href={can.rentals ? "/rentals" : undefined}
              icon={SparklesIcon}
              label={t("members")}
              value={format.number(members?.count ?? 0)}
            />
          ) : null}
          {can.rentals ? (
            <StatCard
              hint={t("overdue", {
                count: format.number(overdueRentals?.count ?? 0),
              })}
              href="/rentals"
              icon={RepeatIcon}
              label={t("rentals")}
              tone={(overdueRentals?.count ?? 0) > 0 ? "attention" : "default"}
              value={format.number(
                (openRentals?.count ?? 0) + (overdueRentals?.count ?? 0)
              )}
            />
          ) : null}
          {can.editorial ? (
            <StatCard
              href="/editorial/submissions"
              icon={BookOpenIcon}
              label={t("submissions")}
              tone={pendingSubmissions > 0 ? "attention" : "default"}
              value={format.number(pendingSubmissions)}
            />
          ) : null}
          {can.marketing ? (
            <StatCard
              href="/marketing"
              icon={MegaphoneIcon}
              label={t("drafts")}
              value={format.number(drafts?.count ?? 0)}
            />
          ) : null}
          {can.marketing ? (
            <StatCard
              href="/customers"
              icon={MailIcon}
              label={t("optedIn")}
              value={format.number(optedIn?.count ?? 0)}
            />
          ) : null}
          {can.telegram ? (
            <StatCard
              href="/telegram"
              icon={SendIcon}
              label={t("telegramRequests")}
              tone={(requests?.count ?? 0) > 0 ? "attention" : "default"}
              value={format.number(requests?.count ?? 0)}
            />
          ) : null}
        </div>
      </PageBody>
    </>
  );
};

export default DashboardPage;

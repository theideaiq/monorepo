import { intlLocale } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { monthStart } from "@/lib/dates";
import { formatters } from "@/lib/format";
import { monthlyTotals, sumTotals } from "@/lib/ledger";
import { requireSection } from "@/lib/session";
import { FinanceChart } from "./_components/finance-chart";
import { FinanceTabs } from "./_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance");
  return { title: t("title") };
};

const MONTHS = 12;

/** Revenue, expenses, COGS and net income from the ledger. */
const FinancePage = async () => {
  const { supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const now = new Date();
  const from = monthStart(now, -(MONTHS - 1));
  const thisMonth = monthStart(now);
  const nextMonth = monthStart(now, 1);
  const lastDay = new Date(`${nextMonth}T00:00:00Z`);
  lastDay.setUTCDate(0);

  const { data, error } = await supabase.rpc("ledger_monthly_summary", {
    from_date: from,
    to_date: lastDay.toISOString().slice(0, 10),
  });
  const months = monthlyTotals(data ?? [], from, MONTHS);
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    timeZone: "UTC",
    year: "2-digit",
  });
  const current = months.at(-1) ?? sumTotals([]);
  const year = thisMonth.slice(0, 4);
  const ytd = sumTotals(months.filter((month) => month.month.startsWith(year)));

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        {error ? (
          <p className="text-destructive text-sm">{t("dashboard.error")}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            hint={t("dashboard.ytd", { amount: format.money(ytd.revenue) })}
            label={t("dashboard.revenueMonth")}
            value={format.money(current.revenue)}
          />
          <StatCard
            hint={t("dashboard.ytd", { amount: format.money(ytd.expenses) })}
            label={t("dashboard.expensesMonth")}
            value={format.money(current.expenses)}
          />
          <StatCard
            hint={t("dashboard.grossHint", {
              amount: format.money(current.gross),
            })}
            label={t("dashboard.cogsMonth")}
            value={format.money(current.cogs)}
          />
          <StatCard
            hint={t("dashboard.ytd", { amount: format.money(ytd.net) })}
            label={t("dashboard.netMonth")}
            tone={current.net < 0 ? "attention" : "default"}
            value={format.money(current.net)}
          />
        </div>
        <Panel
          description={t("dashboard.chartHint")}
          title={t("dashboard.chart")}
        >
          <FinanceChart
            data={months.map((month) => ({
              expenses: month.expenses,
              label: monthLabel.format(new Date(`${month.month}T12:00:00Z`)),
              net: month.net,
              revenue: month.revenue,
            }))}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default FinancePage;

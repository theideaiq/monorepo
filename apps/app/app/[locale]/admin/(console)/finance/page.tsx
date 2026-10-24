import { intlLocale } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatCard } from "@/components/admin/stat-card";
import { monthStart } from "@/lib/admin/dates";
import { fiscalYearStart, scenarioFrom } from "@/lib/admin/finance";
import { formatters } from "@/lib/admin/format";
import { monthlyTotals, sumTotals } from "@/lib/admin/ledger";
import type { SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { FinanceChart } from "./_components/finance-chart";
import { FinanceTabs } from "./_components/finance-tabs";
import { ScenarioSwitcher } from "./_components/scenario-switcher";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance");
  return { title: t("title") };
};

const MONTHS = 12;

/** Revenue, expenses, COGS and net income from the ledger. */
const FinancePage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("finance");
  const params = await searchParams;
  const scenario = scenarioFrom(params);
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const now = new Date();
  const from = monthStart(now, -(MONTHS - 1));
  const thisMonth = monthStart(now);
  const nextMonth = monthStart(now, 1);
  const lastDay = new Date(`${nextMonth}T00:00:00Z`);
  lastDay.setUTCDate(0);

  const [{ data, error }, { data: settings }] = await Promise.all([
    supabase.rpc("ledger_monthly_summary", {
      from_date: from,
      summary_scenario: scenario,
      to_date: lastDay.toISOString().slice(0, 10),
    }),
    supabase
      .from("financial_settings")
      .select("fiscal_year_start_month")
      .maybeSingle(),
  ]);
  const months = monthlyTotals(data ?? [], from, MONTHS);
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "short",
    timeZone: "UTC",
    year: "2-digit",
  });
  const current = months.at(-1) ?? sumTotals([]);
  // "This year" is the fiscal year, which starts at most 11 months back,
  // so it always falls inside the 12 months loaded.
  const yearStart = fiscalYearStart(
    thisMonth,
    settings?.fiscal_year_start_month ?? 1
  );
  const ytd = sumTotals(months.filter((month) => month.month >= yearStart));
  const ytdLabel = (amount: number) =>
    t("dashboard.ytd", {
      amount: format.money(amount),
      since: format.date(`${yearStart}T12:00:00Z`),
    });

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <ScenarioSwitcher
          current={scenario}
          params={params}
          pathname="/finance"
        />
        {scenario === "actual" ? null : (
          <p className="text-muted-foreground text-sm">
            {t("dashboard.scenarioHint", {
              scenario: t(`scenarios.${scenario}`),
            })}
          </p>
        )}
        {error ? (
          <p className="text-destructive text-sm">{t("dashboard.error")}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            hint={ytdLabel(ytd.revenue)}
            label={t("dashboard.revenueMonth")}
            value={format.money(current.revenue)}
          />
          <StatCard
            hint={ytdLabel(ytd.expenses)}
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
            hint={ytdLabel(ytd.net)}
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

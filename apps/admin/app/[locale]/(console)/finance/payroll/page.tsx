import { intlLocale } from "@repo/internationalization/format";
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
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/page";
import { StatCard } from "@/components/stat-card";
import { monthStart } from "@/lib/dates";
import { formatters } from "@/lib/format";
import { projectPayroll } from "@/lib/payroll";
import { requireSection } from "@/lib/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { PositionForm } from "../_components/position-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("payroll") };
};

const MONTHS = 12;

/** The staff plan and the payroll it implies for the next 12 months. */
const PayrollPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const { data: positions } = await supabase
    .from("staff_plan")
    .select("*")
    .order("department")
    .order("role_title");

  const projection = projectPayroll(
    (positions ?? []).map((position) => ({
      ...position,
      annual_increase_pct: Number(position.annual_increase_pct),
    })),
    monthStart(new Date()),
    MONTHS
  );
  const yearTotal = projection.reduce((sum, month) => sum + month.total, 0);
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("payroll.thisMonth")}
            value={format.money(projection[0]?.total ?? 0)}
          />
          <StatCard
            label={t("payroll.headcount")}
            value={format.number(projection[0]?.headcount ?? 0)}
          />
          <StatCard
            label={t("payroll.nextYear")}
            value={format.money(yearTotal)}
          />
        </div>

        <Panel description={t("payroll.description")} title={t("payroll.plan")}>
          {(positions ?? []).map((position) => (
            <PositionForm
              disabled={!canWrite}
              key={position.id}
              position={position}
            />
          ))}
          {canWrite ? (
            <PositionForm key={`new-${positions?.length ?? 0}`} />
          ) : null}
        </Panel>

        <Panel
          description={t("payroll.projectionHint")}
          title={t("payroll.projection")}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("payroll.month")}</TableHead>
                <TableHead className="text-end">
                  {t("payroll.headcount")}
                </TableHead>
                <TableHead className="text-end">{t("payroll.total")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.map((month) => (
                <TableRow key={month.month}>
                  <TableCell>
                    {monthLabel.format(new Date(`${month.month}T12:00:00Z`))}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {format.number(month.headcount)}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">
                    {format.money(month.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold" colSpan={2}>
                  {t("payroll.nextYear")}
                </TableCell>
                <TableCell className="text-end font-semibold tabular-nums">
                  {format.money(yearTotal)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </Panel>
      </PageBody>
    </>
  );
};

export default PayrollPage;

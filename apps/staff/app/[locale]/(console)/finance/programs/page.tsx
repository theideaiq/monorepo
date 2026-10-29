import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { RefundForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("programs") };
};

type Reason = "guardian" | "the_idea" | "unpaid" | "visa_refused" | "withdrawn";

/**
 * Finance → Programs: refunds owed on The IDEA's programs (withdrawals,
 * refused visas, places released or programs called off), paid by Wayl or
 * cash and recorded here; then the ones paid lately.
 */
const ProgramRefundsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance.programs");
  const tFinance = await getTranslations("admin.finance");
  const format = formatters(locale);

  const columns =
    "id, user_id, status, cancel_reason, refund_amount, refunded_at, refund_reference, ended_at, program:programs (opportunity:opportunities (title_ar, title_en))" as const;
  const [{ data: due }, { data: paid }] = await Promise.all([
    supabase
      .from("program_applications")
      .select(columns)
      .gt("refund_amount", 0)
      .is("refunded_at", null)
      .order("ended_at"),
    supabase
      .from("program_applications")
      .select(columns)
      .not("refunded_at", "is", null)
      .order("refunded_at", { ascending: false })
      .limit(30),
  ]);
  const names = await profileNames(supabase, [
    ...(due ?? []).map((row) => row.user_id),
    ...(paid ?? []).map((row) => row.user_id),
  ]);

  type Row = NonNullable<typeof due>[number];
  const title = (row: Row) => {
    const program = Array.isArray(row.program) ? row.program[0] : row.program;
    const opportunity = Array.isArray(program?.opportunity)
      ? program?.opportunity[0]
      : program?.opportunity;
    return opportunity ? localized(opportunity, "title", locale) : "—";
  };
  const reason = (row: Row) =>
    t(`reasons.${(row.cancel_reason ?? "withdrawn") as Reason}`);

  return (
    <>
      <PageHeader title={tFinance("title")} />
      <FinanceTabs />
      <PageBody>
        <Panel description={t("dueDescription")} title={t("due")}>
          {(due ?? []).length === 0 ? (
            <EmptyState title={t("noneDue")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("applicant")}</TableHead>
                    <TableHead>{t("program")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    {canWrite ? <TableHead>{t("record")}</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(due ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{names.get(row.user_id) ?? "—"}</TableCell>
                      <TableCell>{title(row)}</TableCell>
                      <TableCell>
                        {reason(row)}
                        <span className="block text-muted-foreground text-xs">
                          {format.date(row.ended_at)}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.money(row.refund_amount)}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <RefundForm id={row.id} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
        <Panel title={t("paid")}>
          {(paid ?? []).length === 0 ? (
            <EmptyState title={t("nonePaid")} />
          ) : (
            <ul className="grid gap-1 text-sm">
              {(paid ?? []).map((row) => (
                <li key={row.id}>
                  {t("paidLine", {
                    amount: format.money(row.refund_amount),
                    date: format.date(row.refunded_at),
                    name: names.get(row.user_id) ?? "—",
                    program: title(row),
                  })}
                  {row.refund_reference ? (
                    <span className="text-muted-foreground">
                      {" "}
                      · {row.refund_reference}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </PageBody>
    </>
  );
};

export default ProgramRefundsPage;

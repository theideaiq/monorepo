import { formatPrice } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { cancelPayout } from "../actions";
import { CsvButton, PaidForm, PrepareForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("payouts") };
};

/** Today in Baghdad, as YYYY-MM-DD. */
const baghdadToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(
    new Date()
  );

/**
 * Finance → Payouts: Wayl has no payout API, so finance prepares the weekly
 * batch (each shop's lines whose return window has closed, less its
 * deductions), downloads it for the transfers, and marks each payout paid
 * with its reference. A shop sees the same statement in Partners.
 */
const PayoutsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance.payouts");
  const tFinance = await getTranslations("admin.finance");
  const format = formatters(locale);
  const today = baghdadToday();

  const columns =
    "id, number, status, period_end, amount, method, reference, paid_at, created_at, seller:sellers!inner (id, name, details:seller_details (payout_bank, payout_account_name, payout_iban)), lines:payout_lines (kind, amount)" as const;
  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("payouts")
      .select(columns)
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("payouts")
      .select(columns)
      .neq("status", "pending")
      .order("updated_at", { ascending: false })
      .limit(30),
  ]);

  type Row = NonNullable<typeof pending>[number];
  const details = (row: Row) => {
    const value = row.seller.details;
    return Array.isArray(value) ? value[0] : value;
  };
  const summary = (row: Row) => {
    const sales = row.lines.filter((line) => line.kind === "sale");
    const deducted = row.lines
      .filter((line) => line.kind !== "sale")
      .reduce((sum, line) => sum - line.amount, 0);
    return t("summary", {
      deducted: formatPrice(deducted, locale),
      lines: format.number(sales.length),
      period: format.date(row.period_end),
    });
  };

  return (
    <>
      <PageHeader title={tFinance("title")} />
      <FinanceTabs />
      <PageBody>
        {canWrite ? (
          <Panel
            description={t("prepareDescription")}
            title={t("prepareTitle")}
          >
            <PrepareForm today={today} />
          </Panel>
        ) : null}

        <section className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-semibold text-lg">{t("pendingTitle")}</h2>
            <div className="ms-auto">
              <CsvButton
                periodEnd={today}
                rows={(pending ?? []).map((row) => ({
                  account: details(row)?.payout_account_name ?? "",
                  amount: row.amount,
                  bank: details(row)?.payout_bank ?? "",
                  iban: details(row)?.payout_iban ?? "",
                  number: row.number,
                  shop: row.seller.name,
                }))}
              />
            </div>
          </div>
          {(pending ?? []).length === 0 ? (
            <EmptyState title={t("pendingEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(pending ?? []).map((row) => (
                <li className="grid gap-3 rounded-lg border p-4" key={row.id}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <p className="font-medium">
                      {t("line", {
                        number: String(row.number),
                        shop: row.seller.name,
                      })}
                    </p>
                    <p className="ms-auto font-semibold tabular-nums">
                      {formatPrice(row.amount, locale)}
                    </p>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {summary(row)}
                  </p>
                  <p className="text-sm" dir="auto">
                    {details(row)?.payout_iban
                      ? t("account", {
                          bank: details(row)?.payout_bank ?? "",
                          iban: details(row)?.payout_iban ?? "",
                          name: details(row)?.payout_account_name ?? "",
                        })
                      : t("noAccount")}
                  </p>
                  {canWrite ? (
                    <div className="flex flex-wrap items-end gap-3">
                      <PaidForm id={row.id} />
                      <ActionButton
                        action={cancelPayout}
                        confirm={{
                          description: t("cancelDescription"),
                          title: t("cancelTitle"),
                        }}
                        fields={{ id: row.id }}
                        variant="ghost"
                      >
                        {t("cancel")}
                      </ActionButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("recentTitle")}</h2>
          {(recent ?? []).length === 0 ? (
            <EmptyState title={t("recentEmpty")} />
          ) : (
            <ul className="grid gap-2">
              {(recent ?? []).map((row) => (
                <li
                  className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm"
                  key={row.id}
                >
                  <span className="font-medium">
                    {t("line", {
                      number: String(row.number),
                      shop: row.seller.name,
                    })}
                  </span>
                  <StatusBadge status={row.status}>
                    {t(`status.${row.status}`)}
                  </StatusBadge>
                  {row.paid_at && row.method ? (
                    <span className="text-muted-foreground">
                      {t("paidOn", {
                        method: t(
                          `methods.${row.method as "bank" | "qi" | "zaincash"}`
                        ),
                        reference: row.reference ?? "",
                        time: format.dateTime(row.paid_at),
                      })}
                    </span>
                  ) : null}
                  <span className="ms-auto tabular-nums">
                    {formatPrice(row.amount, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default PayoutsPage;

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
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { ownership } from "@/lib/admin/payroll";
import { requireSection } from "@/lib/admin/session";
import { HolderForm, RoundForm } from "../_components/equity-forms";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("equity") };
};

/** The cap table: funding rounds, shareholders and ownership. */
const EquityPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const t = await getTranslations("admin.finance");
  const format = formatters(await getLocale());

  const [{ data: rounds }, { data: holders }] = await Promise.all([
    supabase
      .from("equity_rounds")
      .select("*")
      .order("closed_on", { ascending: true, nullsFirst: false }),
    supabase.from("equity_holders").select("*").order("shares", {
      ascending: false,
    }),
  ]);

  const roundsById = new Map((rounds ?? []).map((round) => [round.id, round]));
  const table = ownership(
    (holders ?? []).map((holder) => ({
      ...holder,
      shares: Number(holder.shares),
    }))
  );
  // Amounts are in the holder's round currency; without a round, plain.
  const money = (amount: number | null, currency: string | undefined) => {
    if (amount === null) {
      return "—";
    }
    return currency
      ? format.moneyIn(Number(amount), currency)
      : format.number(Number(amount));
  };
  const terms = (
    holder: (typeof table.holders)[number],
    currency: string | undefined
  ) => {
    const parts = [
      holder.conversion_cap === null
        ? null
        : t("equity.capTerm", {
            amount: money(holder.conversion_cap, currency),
          }),
      holder.discount_rate === null
        ? null
        : t("equity.discountTerm", {
            percent: format.percent(Number(holder.discount_rate)),
          }),
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "—";
  };
  const roundOptions = (rounds ?? []).map((round) => ({
    id: round.id,
    name: round.name,
  }));

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <Panel description={t("equity.tableHint")} title={t("equity.capTable")}>
          {table.holders.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("equity.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("equity.holder")}</TableHead>
                  <TableHead>{t("equity.type")}</TableHead>
                  <TableHead>{t("equity.instrument")}</TableHead>
                  <TableHead>{t("equity.round")}</TableHead>
                  <TableHead className="text-end">
                    {t("equity.shares")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("equity.ownership")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("equity.value")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("equity.invested")}
                  </TableHead>
                  <TableHead>{t("equity.terms")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {table.holders.map((holder) => {
                  const round = holder.round_id
                    ? roundsById.get(holder.round_id)
                    : undefined;
                  const price = round?.price_per_share
                    ? Number(round.price_per_share)
                    : null;
                  return (
                    <TableRow key={holder.id}>
                      <TableCell className="font-medium">
                        {holder.name}
                      </TableCell>
                      <TableCell>{t(`equity.types.${holder.type}`)}</TableCell>
                      <TableCell>
                        {t(`equity.instruments.${holder.instrument}`)}
                      </TableCell>
                      <TableCell>{round?.name ?? "—"}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.number(holder.shares)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.percent(holder.percent)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {price === null || !round
                          ? "—"
                          : format.moneyIn(
                              holder.shares * price,
                              round.currency
                            )}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {money(holder.invested_amount, round?.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {terms(holder, round?.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold" colSpan={4}>
                    {t("equity.total")}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.number(table.total)}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.percent(table.total > 0 ? 100 : 0)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </Panel>

        <Panel description={t("equity.roundsHint")} title={t("equity.rounds")}>
          {(rounds ?? []).map((round) => (
            <RoundForm disabled={!canWrite} key={round.id} round={round} />
          ))}
          {canWrite ? <RoundForm key={`new-${rounds?.length ?? 0}`} /> : null}
        </Panel>

        <Panel title={t("equity.holders")}>
          {(holders ?? []).map((holder) => (
            <HolderForm
              disabled={!canWrite}
              holder={holder}
              key={holder.id}
              rounds={roundOptions}
            />
          ))}
          {canWrite ? (
            <HolderForm
              key={`new-${holders?.length ?? 0}`}
              rounds={roundOptions}
            />
          ) : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default EquityPage;

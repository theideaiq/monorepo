import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Link } from "@repo/internationalization/navigation";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { Pagination } from "@/components/pagination";
import { formatters } from "@/lib/format";
import { pageRange, param, type SearchParams, searchTerm } from "@/lib/list";
import { requireSection } from "@/lib/session";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("journal") };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Posted journal entries, newest first (entries are never edited). */
const JournalPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("finance");
  const params = await searchParams;
  const t = await getTranslations("admin.finance.journal");
  const tFinance = await getTranslations("admin.finance");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params, 15);

  const since = param(params, "from");
  const until = param(params, "to");
  const q = searchTerm(param(params, "q"));

  let query = supabase
    .from("ledger_entries")
    .select(
      "id, entry_date, description, reference, created_at, ledger_lines(id, debit, credit, memo, chart_of_accounts(code, name))",
      { count: "exact" }
    )
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (DATE.test(since)) {
    query = query.gte("entry_date", since);
  }
  if (DATE.test(until)) {
    query = query.lte("entry_date", until);
  }
  if (q) {
    query = query.or(`description.ilike.%${q}%,reference.ilike.%${q}%`);
  }
  const { count, data: entries } = await query;

  return (
    <>
      <PageHeader title={tFinance("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/finance/journal/new">
              <PlusIcon />
              {t("new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <FinanceTabs />
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("search")}
            type="search"
          />
          <Input
            aria-label={t("from")}
            className="w-auto"
            defaultValue={DATE.test(since) ? since : ""}
            name="from"
            type="date"
          />
          <Input
            aria-label={t("to")}
            className="w-auto"
            defaultValue={DATE.test(until) ? until : ""}
            name="to"
            type="date"
          />
        </FilterBar>

        {(entries ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          (entries ?? []).map((entry) => {
            const total = entry.ledger_lines.reduce(
              (sum, line) => sum + line.debit,
              0
            );
            return (
              <article className="rounded-xl border" key={entry.id}>
                <header className="flex flex-wrap items-baseline justify-between gap-2 border-b px-4 py-3">
                  <div className="grid gap-0.5">
                    <span className="font-medium">{entry.description}</span>
                    <span className="text-muted-foreground text-xs">
                      {format.date(`${entry.entry_date}T12:00:00Z`)}
                      {entry.reference ? ` · ${entry.reference}` : ""}
                    </span>
                  </div>
                  <span className="font-semibold tabular-nums">
                    {format.money(total)}
                  </span>
                </header>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("account")}</TableHead>
                      <TableHead>{t("memo")}</TableHead>
                      <TableHead className="text-end">{t("debit")}</TableHead>
                      <TableHead className="text-end">{t("credit")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entry.ledger_lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <span className="font-mono text-xs" dir="ltr">
                            {line.chart_of_accounts?.code}
                          </span>{" "}
                          {line.chart_of_accounts?.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {line.memo ?? ""}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {line.debit ? format.money(line.debit) : ""}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {line.credit ? format.money(line.credit) : ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </article>
            );
          })
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/finance/journal"
          size={15}
        />
      </PageBody>
    </>
  );
};

export default JournalPage;

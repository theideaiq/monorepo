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
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { affiliateStatusTone, affiliateViews } from "@/lib/admin/affiliates";
import { formatters } from "@/lib/admin/format";
import { oneOf, pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { AffiliateRatesForm } from "./affiliate-forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.affiliates");
  return { title: t("title") };
};

/**
 * Affiliates: applications waiting on marketing first, every affiliate's
 * balance, and (for finance) the commission rate of each category.
 */
const AffiliatesPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("affiliates");
  const params = await searchParams;
  const t = await getTranslations("admin.affiliates");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);
  const view = oneOf(params, "status", affiliateViews) ?? "applied";
  const finance = ["finance", "admin", "superadmin"].includes(staff.role);

  let query = supabase
    .from("affiliates")
    .select("user_id, code, status, channel, created_at", { count: "exact" })
    .order("created_at", { ascending: view === "applied" })
    .range(from, to);
  if (view !== "all") {
    query = query.eq("status", view);
  }

  const [{ count, data }, { data: balances }, { data: categories }] =
    await Promise.all([
      query,
      supabase.rpc("affiliate_balances"),
      supabase
        .from("product_categories")
        .select("id, name_ar, name_en, affiliate_rate")
        .order("position"),
    ]);
  const affiliates = data ?? [];
  const names = await profileNames(
    supabase,
    affiliates.map((affiliate) => affiliate.user_id)
  );
  const balance = new Map(
    (balances ?? []).map((row) => [row.affiliate_id, row])
  );

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <FilterBar>
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={view}
            name="status"
            options={affiliateViews.map((value) => ({
              label: t(`statuses.${value}`),
              value,
            }))}
          />
        </FilterBar>

        {affiliates.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("member")}</TableHead>
                  <TableHead>{t("code")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("ready")}</TableHead>
                  <TableHead>{t("holding")}</TableHead>
                  <TableHead>{t("paid")}</TableHead>
                  <TableHead>{t("applied")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate) => {
                  const money = balance.get(affiliate.user_id);
                  return (
                    <TableRow key={affiliate.user_id}>
                      <TableCell className="max-w-72">
                        <Link
                          className="grid gap-0.5 hover:underline"
                          href={`/affiliates/${affiliate.user_id}`}
                        >
                          <span className="truncate font-medium">
                            {names.get(affiliate.user_id) || t("unnamed")}
                          </span>
                          {affiliate.channel ? (
                            <span
                              className="truncate text-muted-foreground text-xs"
                              dir="ltr"
                            >
                              {affiliate.channel}
                            </span>
                          ) : null}
                        </Link>
                      </TableCell>
                      <TableCell className="font-mono" dir="ltr">
                        {affiliate.code ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          tone={affiliateStatusTone[affiliate.status]}
                        >
                          {t(`statuses.${affiliate.status}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format.money(money?.available ?? 0)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format.money(money?.pending ?? 0)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format.money(money?.paid ?? 0)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(affiliate.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/affiliates"
        />

        <Panel description={t("rates.hint")} title={t("rates.title")}>
          <AffiliateRatesForm
            categories={(categories ?? []).map((category) => ({
              ...category,
              affiliate_rate: Number(category.affiliate_rate),
            }))}
            disabled={!finance}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default AffiliatesPage;

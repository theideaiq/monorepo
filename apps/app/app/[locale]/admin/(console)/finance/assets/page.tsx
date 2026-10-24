import { Input } from "@repo/design-system/components/ui/input";
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
import { FilterBar } from "@/components/admin/filter-bar";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatusBadge, type Tone } from "@/components/admin/status-badge";
import { todayInBaghdad } from "@/lib/admin/dates";
import {
  type AssetState,
  assetState,
  scheduleTotals,
} from "@/lib/admin/finance";
import { formatters } from "@/lib/admin/format";
import { param, type SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { AssetForm } from "../_components/asset-form";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("assets") };
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const stateTone: Record<AssetState, Tone> = {
  depreciating: "info",
  disposed: "neutral",
  fullyDepreciated: "success",
};

/** Fixed assets and their straight-line depreciation as of a date. */
const FixedAssetsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("finance");
  const params = await searchParams;
  const t = await getTranslations("admin.finance");
  const format = formatters(await getLocale());
  const requested = param(params, "asOf");
  const asOf = DATE.test(requested) ? requested : todayInBaghdad();

  const [{ data: schedule, error }, { data: assets }] = await Promise.all([
    supabase.rpc("fixed_asset_schedule", { as_of: asOf }),
    supabase
      .from("fixed_assets")
      .select("*")
      .order("purchase_date", { ascending: true })
      .order("name"),
  ]);

  const rows = schedule ?? [];
  const life = new Map(
    (assets ?? []).map((asset) => [asset.id, asset.useful_life_months])
  );
  const totals = scheduleTotals(rows, life, asOf);
  const day = (value: string | null) =>
    value ? format.date(`${value}T12:00:00Z`) : "—";

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <Panel
          description={t("assets.scheduleHint")}
          title={t("assets.schedule")}
        >
          <FilterBar>
            <div className="grid gap-1">
              <label className="text-muted-foreground text-xs" htmlFor="asOf">
                {t("assets.asOf")}
              </label>
              <Input
                className="w-auto"
                defaultValue={asOf}
                id="asOf"
                name="asOf"
                type="date"
              />
            </div>
          </FilterBar>
          {error ? (
            <p className="text-destructive text-sm">{t("assets.error")}</p>
          ) : null}
          {rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("assets.empty")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("assets.name")}</TableHead>
                  <TableHead>{t("assets.purchaseDate")}</TableHead>
                  <TableHead className="text-end">{t("assets.cost")}</TableHead>
                  <TableHead className="text-end">
                    {t("assets.monthly")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("assets.months")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("assets.accumulated")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("assets.bookValue")}
                  </TableHead>
                  <TableHead>{t("assets.state")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const state = assetState(row, life.get(row.id), asOf);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <span className="grid gap-0.5">
                          <span className="font-medium">{row.name}</span>
                          {row.category ? (
                            <span className="text-muted-foreground text-xs">
                              {row.category}
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {day(row.purchase_date)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(row.cost)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(row.monthly_depreciation)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {t("assets.monthsOf", {
                          elapsed: format.number(row.months_elapsed),
                          life: format.number(life.get(row.id) ?? null),
                        })}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(row.accumulated_depreciation)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(row.book_value)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={stateTone[state]}>
                          {state === "disposed"
                            ? t("assets.disposedState", {
                                date: day(row.disposed_on),
                              })
                            : t(`assets.states.${state}`)}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="font-semibold" colSpan={2}>
                    {t("assets.total")}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.money(totals.cost)}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.money(totals.monthly)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.money(totals.accumulated)}
                  </TableCell>
                  <TableCell className="text-end font-semibold tabular-nums">
                    {format.money(totals.bookValue)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </Panel>

        <Panel description={t("assets.listHint")} title={t("assets.list")}>
          {(assets ?? []).map((asset) => (
            <AssetForm
              asset={asset}
              disabled={!canWrite}
              key={`${asset.id}-${asset.updated_at}`}
            />
          ))}
          {canWrite ? <AssetForm key={`new-${assets?.length ?? 0}`} /> : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default FixedAssetsPage;

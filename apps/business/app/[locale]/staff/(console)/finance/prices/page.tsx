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
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("prices") };
};

/**
 * The price check: copies for sale without a cost, or whose price leaves
 * less than the margin floor after the cost, the payment fee, a delivery
 * and the largest giveaway (`price_check()`), worst first. Each links to
 * its product, where the copy's cost and price are edited.
 */
const PricesPage = async () => {
  const { supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance.prices");
  const tFinance = await getTranslations("admin.finance");
  const tCondition = await getTranslations("store.condition");
  const format = formatters(locale);
  const { data: rows } = await supabase.rpc("price_check", { max_rows: 500 });
  const missing = (rows ?? []).filter((row) => row.problem === "no_cost");
  const below = (rows ?? []).filter((row) => row.problem === "below_floor");

  return (
    <>
      <PageHeader title={tFinance("title")} />
      <FinanceTabs />
      <PageBody>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
        <p className="font-medium text-sm">
          {t("summary", {
            below: format.number(below.length),
            missing: format.number(missing.length),
          })}
        </p>
        {(rows ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("problem")}</TableHead>
                  <TableHead className="text-end">{t("price")}</TableHead>
                  <TableHead className="text-end">{t("cost")}</TableHead>
                  <TableHead className="text-end">{t("margin")}</TableHead>
                  <TableHead className="text-end">{t("floor")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((row) => (
                  <TableRow key={row.stock_item_id}>
                    <TableCell>
                      <Link
                        className="hover:underline"
                        href={`/catalog/products/${row.product_id}`}
                      >
                        {localized(row, "name", locale)}
                      </Link>
                      <span className="block text-muted-foreground text-xs">
                        {[row.variant_label, tCondition(row.condition)]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={row.problem === "no_cost" ? "warning" : "danger"}
                      >
                        {t(row.problem === "no_cost" ? "noCost" : "belowFloor")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(row.price)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.cost === null ? "—" : format.money(row.cost)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {row.margin === null ? "—" : format.money(row.margin)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(row.floor_amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default PricesPage;

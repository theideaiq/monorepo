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
import { ProductCover } from "@/components/admin/product-cover";
import { SectionTabs } from "@/components/admin/section-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { plusTabs } from "../tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals.tabs");
  return { title: t("demand") };
};

/**
 * Plus → Demand: the most-queued products against their copies for rent,
 * with how many more to buy (one copy for every three people queued,
 * from `staff_plus_demand()`).
 */
const DemandPage = async () => {
  const { staff, supabase } = await requireSection("rentals");
  const locale = await getLocale();
  const t = await getTranslations("admin.rentals");
  const format = formatters(locale);
  const { data, error } = await supabase.rpc("staff_plus_demand");
  const rows = data ?? [];
  const linkProducts = canRead(staff.role, "catalog");
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <>
      <PageHeader description={t("demand.description")} title={t("title")} />
      <SectionTabs tabs={plusTabs(t, staff.role)} />
      <PageBody>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {t("demand.error")}
          </p>
        ) : null}
        {rows.length === 0 && !error ? (
          <EmptyState title={t("demand.empty")} />
        ) : null}
        {rows.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("demand.product")}</TableHead>
                  <TableHead className="text-end">
                    {t("demand.queued")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("demand.copies")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("demand.available")}
                  </TableHead>
                  <TableHead className="text-end">{t("demand.out")}</TableHead>
                  <TableHead className="text-end">
                    {t("demand.suggested")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const name = localized(row, "name", locale);
                  return (
                    <TableRow key={row.product_id}>
                      <TableCell>
                        <span className="flex items-center gap-3">
                          <ProductCover
                            image={row.images[0]}
                            supabaseUrl={supabaseUrl}
                          />
                          {linkProducts ? (
                            <Link
                              className="font-medium hover:underline"
                              href={`/catalog/products/${row.product_id}`}
                            >
                              {name}
                            </Link>
                          ) : (
                            <span className="font-medium">{name}</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.number(row.queued)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.number(row.copies)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.number(row.available)}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.number(row.rented_out)}
                      </TableCell>
                      <TableCell className="text-end">
                        {row.suggested > 0 ? (
                          <StatusBadge tone="warning">
                            {t("demand.buy", {
                              count: format.number(row.suggested),
                            })}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("demand.enough")}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </PageBody>
    </>
  );
};

export default DemandPage;

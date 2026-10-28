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
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { resolveProductCheck, resolveProductFlag } from "./actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.checks");
  return { title: t("title") };
};

const LIMIT = 100;

interface ProductRef {
  id: string;
  name_ar: string;
  name_en: string;
  status: string;
}

/**
 * Catalog → Checks: what the automatic checks found on products shops
 * created (missing details or photo, a banned item, a likely duplicate),
 * and shops' flags on wrong details. Staff fix or merge the product, then
 * mark the item resolved.
 */
const ChecksPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog.checks");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(locale);

  const [{ data: checks }, { data: flags }] = await Promise.all([
    supabase
      .from("product_checks")
      .select(
        "id, reason, created_at, product:products!product_checks_product_id_fkey(id, name_ar, name_en, status), other:products!product_checks_other_product_id_fkey(id, name_ar, name_en, status)"
      )
      .is("resolved_at", null)
      .order("created_at")
      .limit(LIMIT),
    supabase
      .from("product_flags")
      .select(
        "id, note, created_at, product:products(id, name_ar, name_en, status), seller:sellers(name)"
      )
      .is("resolved_at", null)
      .order("created_at")
      .limit(LIMIT),
  ]);

  const productLink = (product: ProductRef | null) =>
    product ? (
      <Link
        className="font-medium hover:underline"
        href={`/catalog/products/${product.id}`}
      >
        {localized(product, "name", locale)}
      </Link>
    ) : (
      <span className="text-muted-foreground">{t("deleted")}</span>
    );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <CatalogTabs />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("checksTitle")}</h2>
          {(checks ?? []).length === 0 ? (
            <EmptyState title={t("checksEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("reason")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    {canWrite ? (
                      <TableHead className="text-end">
                        {tCommon("actions")}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(checks ?? []).map((check) => (
                    <TableRow key={check.id}>
                      <TableCell className="max-w-64">
                        <span className="grid gap-1">
                          {productLink(check.product)}
                          {check.product?.status === "active" ? null : (
                            <StatusBadge tone="neutral">
                              {t("notLive")}
                            </StatusBadge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <span className="grid gap-1">
                          <StatusBadge
                            tone={
                              check.reason === "banned" ? "danger" : "warning"
                            }
                          >
                            {t(`reasons.${check.reason}`)}
                          </StatusBadge>
                          {check.other ? (
                            <span className="text-muted-foreground text-xs">
                              {t("duplicateOf")} {productLink(check.other)}
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(check.created_at)}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <span className="flex justify-end">
                            <ActionButton
                              action={resolveProductCheck}
                              fields={{ id: check.id }}
                            >
                              {t("resolve")}
                            </ActionButton>
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="grid gap-3" id="flags">
          <h2 className="font-semibold text-lg">{t("flagsTitle")}</h2>
          {(flags ?? []).length === 0 ? (
            <EmptyState title={t("flagsEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("shop")}</TableHead>
                    <TableHead>{t("note")}</TableHead>
                    <TableHead>{t("date")}</TableHead>
                    {canWrite ? (
                      <TableHead className="text-end">
                        {tCommon("actions")}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(flags ?? []).map((flag) => (
                    <TableRow key={flag.id}>
                      <TableCell className="max-w-64">
                        {productLink(flag.product)}
                      </TableCell>
                      <TableCell>{flag.seller?.name ?? ""}</TableCell>
                      <TableCell className="min-w-56 max-w-md whitespace-normal">
                        <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm">
                          {flag.note}
                        </p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(flag.created_at)}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <span className="flex justify-end">
                            <ActionButton
                              action={resolveProductFlag}
                              fields={{ id: flag.id }}
                            >
                              {t("resolve")}
                            </ActionButton>
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default ChecksPage;

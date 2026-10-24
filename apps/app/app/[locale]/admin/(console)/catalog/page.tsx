import { localized } from "@repo/commerce";
import { productImageUrl } from "@repo/commerce/catalog";
import { Constants } from "@repo/database";
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
import { ImageIcon, PlusIcon, StarIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { formatters } from "@/lib/admin/format";
import {
  isUuid,
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "./_components/catalog-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog");
  return { title: t("title") };
};

const { Enums } = Constants.public;

const ProductsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("catalog");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog");
  const tStore = await getTranslations("store");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const q = searchTerm(param(params, "q"));
  const kind = oneOf(params, "kind", Enums.product_kind);
  const status = oneOf(params, "status", Enums.product_status);
  const categoryParam = param(params, "category");
  const category = isUuid(categoryParam) ? categoryParam : null;

  let query = supabase
    .from("products")
    .select(
      "id, slug, kind, status, name_ar, name_en, price, stock_count, featured, images, product_categories(name_ar, name_en)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (q) {
    query = query.or(
      `name_ar.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`
    );
  }
  if (kind) {
    query = query.eq("kind", kind);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (category) {
    query = query.eq("category_id", category);
  }

  const [{ count, data: products }, { data: categories }] = await Promise.all([
    query,
    supabase
      .from("product_categories")
      .select("id, name_ar, name_en")
      .order("position"),
  ]);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild variant="outline">
            <Link href="/catalog/covers">
              <ImageIcon />
              {t("covers.findMissing")}
            </Link>
          </Button>
        ) : null}
        {canWrite ? (
          <Button asChild>
            <Link href="/catalog/products/new">
              <PlusIcon />
              {t("products.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <CatalogTabs />
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("products.search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("products.search")}
            type="search"
          />
          <NativeSelect
            aria-label={t("fields.kind")}
            className="w-auto"
            defaultValue={kind ?? ""}
            name="kind"
            options={[
              { label: t("filters.anyKind"), value: "" },
              ...Enums.product_kind.map((value) => ({
                label: tStore(`kind.${value}`),
                value,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("fields.status")}
            className="w-auto"
            defaultValue={status ?? ""}
            name="status"
            options={[
              { label: t("filters.anyStatus"), value: "" },
              ...Enums.product_status.map((value) => ({
                label: t(`productStatus.${value}`),
                value,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("fields.category")}
            className="w-auto"
            defaultValue={category ?? ""}
            name="category"
            options={[
              { label: t("filters.anyCategory"), value: "" },
              ...(categories ?? []).map((item) => ({
                label: localized(item, "name", locale),
                value: item.id,
              })),
            ]}
          />
        </FilterBar>

        {(products ?? []).length === 0 ? (
          <EmptyState title={t("products.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("fields.name")}</TableHead>
                  <TableHead>{t("fields.kind")}</TableHead>
                  <TableHead>{t("fields.category")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                  <TableHead className="text-end">
                    {t("fields.price")}
                  </TableHead>
                  <TableHead className="text-end">
                    {t("fields.stock")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(products ?? []).map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-3 font-medium hover:underline"
                        href={`/catalog/products/${product.id}`}
                      >
                        {product.images[0] ? (
                          // biome-ignore lint/performance/noImgElement: small thumbnails from Storage
                          <img
                            alt=""
                            className="size-10 shrink-0 rounded-md border object-cover"
                            height={40}
                            src={productImageUrl(
                              supabaseUrl,
                              product.images[0]
                            )}
                            width={40}
                          />
                        ) : (
                          <span className="size-10 shrink-0 rounded-md border bg-muted" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate">
                            {localized(product, "name", locale)}
                          </span>
                          <span
                            className="block truncate text-muted-foreground text-xs"
                            dir="ltr"
                          >
                            {product.slug}
                          </span>
                        </span>
                        {product.featured ? (
                          <StarIcon
                            aria-label={t("fields.featured")}
                            className="size-4 shrink-0 fill-bulb-yellow text-warning"
                          />
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell>{tStore(`kind.${product.kind}`)}</TableCell>
                    <TableCell>
                      {product.product_categories
                        ? localized(product.product_categories, "name", locale)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={product.status}>
                        {t(`productStatus.${product.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(product.price)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(product.stock_count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/catalog"
        />
      </PageBody>
    </>
  );
};

export default ProductsPage;

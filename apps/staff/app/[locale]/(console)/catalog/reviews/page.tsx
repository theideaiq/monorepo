import { localized } from "@repo/commerce";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { XIcon } from "lucide-react";
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
  withParams,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { ratings, reviewStatuses } from "@/lib/admin/reviews";
import { canRead } from "@/lib/admin/roles";
import { requireSection, type ServerClient } from "@/lib/admin/session";
import { ReviewRow } from "./review-row";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.reviews");
  return { title: t("title") };
};

const MAX_PRODUCTS = 200;
const TRAILING_SLASH = /\/$/;

/** Ids of products whose name or slug matches (null without a search). */
const matchingProducts = async (supabase: ServerClient, q: string) => {
  if (!q) {
    return null;
  }
  const { data } = await supabase
    .from("products")
    .select("id")
    .or(`name_ar.ilike.%${q}%,name_en.ilike.%${q}%,slug.ilike.%${q}%`)
    .limit(MAX_PRODUCTS);
  return (data ?? []).map((row) => row.id);
};

/** Reviews matching the filters, newest first. */
const loadReviews = async (supabase: ServerClient, params: SearchParams) => {
  const { from, to } = pageRange(params);
  const status = oneOf(params, "status", reviewStatuses);
  const rating = oneOf(params, "rating", ratings);
  const productParam = param(params, "product");
  const productId = isUuid(productParam) ? productParam : null;
  const q = searchTerm(param(params, "q"));
  const productIds = productId ? null : await matchingProducts(supabase, q);

  let query = supabase
    .from("product_reviews")
    .select(
      "id, product_id, user_id, rating, comment, verified_purchase, status, created_at, products(id, slug, name_ar, name_en)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) {
    query = query.eq("status", status);
  }
  if (rating) {
    query = query.eq("rating", Number(rating));
  }
  if (productId) {
    query = query.eq("product_id", productId);
  } else if (productIds) {
    query = query.in(
      "product_id",
      productIds.length > 0 ? productIds : [crypto.randomUUID()]
    );
  }

  const { count, data } = await query;
  return {
    count,
    filters: { productId, q, rating, status },
    reviews: data ?? [],
  };
};

/** Product reviews: hide, publish again or delete. */
const ReviewsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, staff, supabase } = await requireSection("reviews");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.reviews");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(locale);
  const { page } = pageRange(params);

  const { count, filters, reviews } = await loadReviews(supabase, params);
  const { productId, q, rating, status } = filters;
  const names = await profileNames(
    supabase,
    reviews.map((review) => review.user_id)
  );
  const firstProduct = reviews[0]?.products;
  const productLabel = firstProduct
    ? localized(firstProduct, "name", locale)
    : t("deletedProduct");
  const can = {
    catalog: canRead(staff.role, "catalog"),
    customers: canRead(staff.role, "customers"),
    write: canWrite,
  };
  const storeUrl = env.NEXT_PUBLIC_WEB_URL.replace(TRAILING_SLASH, "");

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <FilterBar>
          {productId ? (
            <input name="product" type="hidden" value={productId} />
          ) : (
            <Input
              aria-label={t("search")}
              className="w-56"
              defaultValue={q}
              name="q"
              placeholder={t("search")}
              type="search"
            />
          )}
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={status ?? ""}
            name="status"
            options={[
              { label: t("anyStatus"), value: "" },
              ...reviewStatuses.map((value) => ({
                label: t(`statuses.${value}`),
                value,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("rating")}
            className="w-auto"
            defaultValue={rating ?? ""}
            name="rating"
            options={[
              { label: t("anyRating"), value: "" },
              ...ratings.map((value) => ({
                label: t("stars", { count: format.number(Number(value)) }),
                value,
              })),
            ]}
          />
        </FilterBar>
        {productId ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("forProduct")}</span>
            <StatusBadge tone="brand">{productLabel}</StatusBadge>
            <Link
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              href={`/catalog/reviews${withParams(params, { page: null, product: null })}`}
            >
              <XIcon className="size-4" />
              {t("allProducts")}
            </Link>
          </div>
        ) : null}

        {reviews.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("product")}</TableHead>
                  <TableHead>{t("rating")}</TableHead>
                  <TableHead>{t("comment")}</TableHead>
                  <TableHead>{t("author")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  {canWrite ? (
                    <TableHead className="text-end">
                      {tCommon("actions")}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <ReviewRow
                    authorName={names.get(review.user_id)}
                    can={can}
                    format={format}
                    key={review.id}
                    locale={locale}
                    review={review}
                    storeUrl={storeUrl}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/catalog/reviews"
        />
      </PageBody>
    </>
  );
};

export default ReviewsPage;

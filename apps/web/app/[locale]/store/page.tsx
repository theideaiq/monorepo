import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { EmptyState, Section } from "@/components/section";
import { getCategories, getProducts, getRatings } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import {
  parseStoreQuery,
  STORE_PAGE_SIZE,
  storeQueryString,
  storeSorts,
} from "@/lib/store-params";

interface StoreProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const generateMetadata = async ({
  params,
  searchParams,
}: StoreProps): Promise<Metadata> => {
  const { locale } = await params;
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.store.meta" });
  const metadata = localizedMetadata(locale, "/store", {
    description: t("description"),
    title: t("title"),
  });
  // Filtered and paginated views point search engines at the main catalog.
  const filtered = Boolean(query.q || query.category || query.page > 1);
  return filtered
    ? { ...metadata, robots: { follow: true, index: false } }
    : metadata;
};

const Store = async ({ params, searchParams }: StoreProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web" });

  const [categories, rows] = await Promise.all([
    getCategories("sale"),
    getProducts({
      category: query.category,
      kind: "sale",
      // One extra row tells whether there is a next page.
      limit: STORE_PAGE_SIZE + 1,
      offset: (query.page - 1) * STORE_PAGE_SIZE,
      search: query.q,
      sort: query.sort,
    }),
  ]);
  const products = rows.slice(0, STORE_PAGE_SIZE);
  const ratings = await getRatings(products.map((product) => product.id));
  const hasNext = rows.length > STORE_PAGE_SIZE;
  const filtered = Boolean(query.q || query.category);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-4 py-1.5 text-sm transition-colors",
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "hover:bg-muted"
    );

  return (
    <>
      <PageHero subtitle={t("store.description")} title={t("store.title")} />
      <Section>
        <form
          action=""
          className="mb-6 flex flex-col gap-3 md:flex-row md:items-end"
          method="get"
        >
          {query.category ? (
            <input name="category" type="hidden" value={query.category} />
          ) : null}
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <label className="sr-only" htmlFor="store-search">
              {t("store.searchLabel")}
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="ps-9"
                defaultValue={query.q}
                id="store-search"
                maxLength={100}
                name="q"
                placeholder={t("store.searchPlaceholder")}
                type="search"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <label className="text-muted-foreground" htmlFor="store-sort">
              {t("store.sortLabel")}
            </label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              defaultValue={query.sort}
              id="store-sort"
              name="sort"
            >
              {storeSorts.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`store.sort.${sort}`)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit">{t("store.search")}</Button>
        </form>

        <nav
          aria-label={t("store.categories")}
          className="mb-8 flex flex-wrap gap-2"
        >
          <Link
            className={chip(!query.category)}
            href={`/store${storeQueryString(query, { category: undefined, page: 1 })}`}
          >
            {t("store.allCategories")}
          </Link>
          {categories.map((category) => (
            <Link
              aria-current={
                query.category === category.slug ? "page" : undefined
              }
              className={chip(query.category === category.slug)}
              href={`/store${storeQueryString(query, { category: category.slug, page: 1 })}`}
              key={category.id}
            >
              {localized(category, "name", locale)}
            </Link>
          ))}
        </nav>

        {query.q ? (
          <p className="mb-4 text-muted-foreground">
            {t("store.results", { query: query.q })}
          </p>
        ) : null}

        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                locale={locale}
                product={product}
                rating={ratings[product.id]}
              />
            ))}
          </div>
        ) : (
          <EmptyState>
            {t("store.empty")}{" "}
            {filtered ? (
              <Link className="text-primary underline" href="/store">
                {t("store.clear")}
              </Link>
            ) : null}
          </EmptyState>
        )}

        <Pagination
          hasNext={hasNext}
          hrefFor={(page) => `/store${storeQueryString(query, { page })}`}
          locale={locale}
          page={query.page}
        />
      </Section>
    </>
  );
};

export default Store;

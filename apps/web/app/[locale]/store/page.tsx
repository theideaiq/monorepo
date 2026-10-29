import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { EmptyState, Section } from "@/components/section";
import { env } from "@/env";
import { getCategories, getFormats, getProducts, getRatings } from "@/lib/data";
import { appLink } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";
import {
  parseStoreQuery,
  STORE_PAGE_SIZE,
  storeQueryString,
  storeSorts,
} from "@/lib/store-params";

/** Formats with a name in the messages files; others show as stored. */
const NAMED_FORMATS = [
  "CD",
  "Vinyl",
  "Cassette",
  "CD+DVD",
  "DVD",
  "Blu-ray",
] as const;

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
  const filtered = Boolean(
    query.q || query.category || query.format || query.page > 1
  );
  return filtered
    ? { ...metadata, robots: { follow: true, index: false } }
    : metadata;
};

const Store = async ({ params, searchParams }: StoreProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web" });

  const [categories, formats, rows] = await Promise.all([
    getCategories("sale"),
    getFormats(),
    getProducts({
      category: query.category,
      format: query.format,
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
  const filtered = Boolean(query.q || query.category || query.format);
  const formatName = (format: string) =>
    (NAMED_FORMATS as readonly string[]).includes(format)
      ? t(`store.formats.${format as (typeof NAMED_FORMATS)[number]}`)
      : format;

  // Top-level categories, and the selected one's family underneath.
  const topLevel = categories.filter((category) => !category.parent_id);
  const selected = categories.find((c) => c.slug === query.category);
  const parentId = selected?.parent_id ?? selected?.id;
  const parent = categories.find((category) => category.id === parentId);
  const subcategories = categories.filter((c) => c.parent_id === parentId);

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
          className="mb-6 flex flex-wrap items-end justify-end gap-3"
          method="get"
        >
          {query.category ? (
            <input name="category" type="hidden" value={query.category} />
          ) : null}
          {query.format ? (
            <input name="format" type="hidden" value={query.format} />
          ) : null}
          {query.q ? <input name="q" type="hidden" value={query.q} /> : null}
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
          <Button type="submit" variant="outline">
            {t("store.sortApply")}
          </Button>
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
          {topLevel.map((category) => (
            <Link
              aria-current={
                query.category === category.slug ? "page" : undefined
              }
              className={chip(category.id === parentId)}
              href={`/store${storeQueryString(query, { category: category.slug, page: 1 })}`}
              key={category.id}
            >
              {localized(category, "name", locale)}
            </Link>
          ))}
          <Link className={chip(false)} href="/store/auctions">
            {t("store.auctionsLink")}
          </Link>
        </nav>

        {parent && subcategories.length > 0 ? (
          <nav
            aria-label={t("store.subcategories")}
            className="-mt-4 mb-8 flex flex-wrap gap-2"
          >
            <Link
              className={chip(query.category === parent.slug)}
              href={`/store${storeQueryString(query, { category: parent.slug, page: 1 })}`}
            >
              {t("store.allIn", {
                category: localized(parent, "name", locale),
              })}
            </Link>
            {subcategories.map((category) => (
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
        ) : null}

        {formats.length > 1 ? (
          <nav
            aria-label={t("store.formatsLabel")}
            className="-mt-4 mb-8 flex flex-wrap gap-2"
          >
            <Link
              className={chip(!query.format)}
              href={`/store${storeQueryString(query, { format: undefined, page: 1 })}`}
            >
              {t("store.allFormats")}
            </Link>
            {formats.map((format) => (
              <Link
                aria-current={query.format === format ? "page" : undefined}
                className={chip(query.format === format)}
                href={`/store${storeQueryString(query, { format, page: 1 })}`}
                key={format}
              >
                {formatName(format)}
              </Link>
            ))}
          </nav>
        ) : null}

        {query.category === "textbooks" ? (
          <p className="mb-6 rounded-lg border bg-muted/40 p-4 text-sm">
            {t("store.sellTextbooks")}{" "}
            <a
              className="font-medium text-pink-text underline"
              href={appLink(env.NEXT_PUBLIC_APP_URL, locale, "/new", {
                for: "selling",
              })}
            >
              {t("store.sellTextbooksLink")}
            </a>
          </p>
        ) : null}

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
              <Link className="text-pink-text underline" href="/store">
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

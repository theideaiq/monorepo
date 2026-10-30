import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShelfTabs } from "@/components/shop/shelf-tabs";
import { CatalogueGrid } from "@/components/store/catalogue-grid";
import { CodesLink } from "@/components/store/digital-codes";
import {
  getCategories,
  getFormats,
  getProducts,
  recordSearchMiss,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import {
  activeFilterCount,
  gridFilters,
  parseStoreQuery,
  STORE_PAGE_SIZE,
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
  const filtered = Boolean(
    query.q || query.category || activeFilterCount(query) || query.page > 1
  );
  return filtered
    ? { ...metadata, robots: { follow: true, index: false } }
    : metadata;
};

/**
 * The whole Store in one grid: search results (`?q=`) and everything for
 * sale, with the filters and the sort. Each category has its own shelf at
 * `/store/<category>`.
 */
const Store = async ({ params, searchParams }: StoreProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.store" });

  const [categories, formats, rows] = await Promise.all([
    getCategories("sale"),
    getFormats(),
    getProducts(gridFilters(query)),
  ]);
  const { q } = query;
  if (q && query.page === 1 && !query.category && rows.length === 0) {
    // After the page is sent: Staff see what people looked for in vain.
    after(() => recordSearchMiss(q));
  }

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-4">
        <ShelfTabs active="" categories={categories} locale={locale} />
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {q ? t("results", { query: q }) : t("title")}
        </h1>
        {q || query.category ? null : <CodesLink />}
      </div>
      <CatalogueGrid
        basePath="/store"
        formats={formats}
        hasNext={rows.length > STORE_PAGE_SIZE}
        locale={locale}
        products={rows.slice(0, STORE_PAGE_SIZE)}
        query={query}
        title={t("allProducts")}
      />
    </>
  );
};

export default Store;

import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShelfTabs } from "@/components/shop/shelf-tabs";
import { CatalogueGrid } from "@/components/store/catalogue-grid";
import { getCategories, getFormats, getProducts } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import {
  gridFilters,
  parseStoreQuery,
  STORE_PAGE_SIZE,
} from "@/lib/store-params";

interface DealsProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const generateMetadata = async ({
  params,
}: DealsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  return localizedMetadata(locale, "/store/deals", {
    description: t("dealsDescription"),
    title: t("dealsTitle"),
  });
};

/**
 * Store → Deals: everything with an honest "was" price (held 15 of the
 * last 30 days), in one grid with the filters.
 */
const DealsPage = async ({ params, searchParams }: DealsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  const [categories, formats, rows] = await Promise.all([
    getCategories("sale"),
    getFormats(),
    getProducts({ ...gridFilters(query), onSale: true }),
  ]);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-4">
        <ShelfTabs active="deals" categories={categories} locale={locale} />
        <div className="grid gap-1">
          <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
            {t("dealsTitle")}
          </h1>
          <p className="text-muted-foreground">{t("dealsDescription")}</p>
        </div>
      </div>
      <CatalogueGrid
        basePath="/store/deals"
        formats={formats}
        hasNext={rows.length > STORE_PAGE_SIZE}
        locale={locale}
        products={rows.slice(0, STORE_PAGE_SIZE)}
        query={query}
        title={t("dealsTitle")}
      />
    </>
  );
};

export default DealsPage;

import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CatalogueGrid } from "@/components/store/catalogue-grid";
import { getFormats, getProducts, getShop } from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import {
  gridFilters,
  parseStoreQuery,
  STORE_PAGE_SIZE,
} from "@/lib/store-params";

interface ShopProps {
  params: Promise<{ locale: Locale; shop: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const generateMetadata = async ({
  params,
}: ShopProps): Promise<Metadata> => {
  const { locale, shop: id } = await params;
  const shop = await getShop(id);
  if (!shop) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  return localizedMetadata(locale, `/store/shops/${id}`, {
    description: t("shopDescription", { shop: shop.name }),
    title: shop.name,
  });
};

/**
 * `/store/shops/<shop>`: an approved shop's shelf, the products it lists
 * on The IDEA (`products.created_by_seller`), with the filters.
 */
const ShopPage = async ({ params, searchParams }: ShopProps) => {
  const { locale, shop: id } = await params;
  setRequestLocale(locale);
  const shop = await getShop(id);
  if (!shop) {
    notFound();
  }
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.store.shelf" });
  const [formats, rows] = await Promise.all([
    getFormats(),
    getProducts({ ...gridFilters(query), createdBySeller: shop.id }),
  ]);

  return (
    <>
      <div className="container mx-auto grid gap-1 px-4 pt-6">
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("shopTitle", { shop: shop.name })}
        </h1>
        <p className="text-muted-foreground">
          {t("shopDescription", { shop: shop.name })}
        </p>
      </div>
      <CatalogueGrid
        basePath={`/store/shops/${shop.id}`}
        formats={formats}
        hasNext={rows.length > STORE_PAGE_SIZE}
        locale={locale}
        products={rows.slice(0, STORE_PAGE_SIZE)}
        query={query}
        title={t("seeAll")}
      />
    </>
  );
};

export default ShopPage;

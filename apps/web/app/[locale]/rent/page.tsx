import { formatPrice } from "@repo/commerce";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { type Locale, localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination } from "@/components/pagination";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/section";
import { CategoryChips } from "@/components/shop/category-chips";
import { ShopSwitch } from "@/components/shop/shop-switch";
import { StoreSearch } from "@/components/shop/store-search";
import {
  getCategories,
  getPlans,
  getProducts,
  getRatings,
  getRentalTiers,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { requiredPlan } from "@/lib/plus";
import {
  parseStoreQuery,
  STORE_PAGE_SIZE,
  storeQueryString,
} from "@/lib/store-params";

export const revalidate = 300;

interface RentProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const generateMetadata = async ({
  params,
  searchParams,
}: RentProps): Promise<Metadata> => {
  const { locale } = await params;
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.rent.meta" });
  const metadata = localizedMetadata(locale, "/rent", {
    description: t("description"),
    title: t("title"),
  });
  const filtered = Boolean(query.q || query.category || query.page > 1);
  return filtered
    ? { ...metadata, robots: { follow: true, index: false } }
    : metadata;
};

/**
 * The rental storefront: everything The IDEA Plus members can rent, with
 * the plan each item needs. The plans themselves are on /plus.
 */
const Rent = async ({ params, searchParams }: RentProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web" });

  const [categories, plans, rows] = await Promise.all([
    getCategories("rental"),
    getPlans("plus"),
    getProducts({
      category: query.category,
      kind: "rental",
      limit: STORE_PAGE_SIZE + 1,
      offset: (query.page - 1) * STORE_PAGE_SIZE,
      search: query.q,
    }),
  ]);
  const products = rows.slice(0, STORE_PAGE_SIZE);
  const ids = products.map((product) => product.id);
  const [ratings, tiers] = await Promise.all([
    getRatings(ids),
    getRentalTiers(ids),
  ]);
  const [cheapest] = plans
    .filter((plan) => plan.billing_interval === "month")
    .sort((a, b) => a.amount - b.amount);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-6 pb-2">
        <ShopSwitch active="rent" locale={locale} />
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("rent.title")} <Highlight>{t("rent.highlight")}</Highlight>
        </h1>
        <StoreSearch
          action={localePath(locale, "/rent")}
          defaultValue={query.q}
          id="rent-search"
          label={t("rent.searchLabel")}
          placeholder={t("rent.searchPlaceholder")}
        />
        <CategoryChips
          categories={categories}
          hrefFor={(slug) =>
            `/rent${storeQueryString(query, { category: slug, page: 1 })}`
          }
          label={t("store.categories")}
          locale={locale}
        />
        <Link
          className="inline-flex items-center gap-2 self-start rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted"
          href="/plus"
        >
          {cheapest
            ? t("rent.plansFrom", {
                price: formatPrice(cheapest.amount, locale),
              })
            : t("rent.plans")}
          <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Link>
      </div>

      <section className="container mx-auto px-4 py-6">
        {query.q ? (
          <p className="mb-4 text-muted-foreground">
            {t("store.results", { query: query.q })}
          </p>
        ) : null}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const plan = requiredPlan(plans, tiers[product.id]);
              return (
                <ProductCard
                  key={product.id}
                  locale={locale}
                  planLabel={
                    plan
                      ? t("plus.catalog.needsPlan", { plan: plan.name })
                      : null
                  }
                  product={product}
                  rating={ratings[product.id]}
                />
              );
            })}
          </div>
        ) : (
          <EmptyState>
            {t("rent.empty")}{" "}
            {query.q || query.category ? (
              <Link className="text-pink-text underline" href="/rent">
                {t("store.clear")}
              </Link>
            ) : null}
          </EmptyState>
        )}
        <Pagination
          hasNext={rows.length > STORE_PAGE_SIZE}
          hrefFor={(page) => `/rent${storeQueryString(query, { page })}`}
          locale={locale}
          page={query.page}
        />
      </section>
    </>
  );
};

export default Rent;

import { formatPrice, localized, planName } from "@repo/commerce";
import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pagination } from "@/components/pagination";
import { PlanCard } from "@/components/plan-card";
import { ProductCard } from "@/components/product-card";
import { YourPlus } from "@/components/screens/plus";
import { EmptyState, Section } from "@/components/section";
import { CategoryChips } from "@/components/shop/category-chips";
import {
  getCategories,
  getKitTypes,
  getPlans,
  getProducts,
  getRatings,
  getRentalTiers,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { plansByTier, requiredPlan } from "@/lib/plus";
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

type Steps = Messages["web"]["plus"]["how"]["steps"];

export const generateMetadata = async ({
  params,
  searchParams,
}: RentProps): Promise<Metadata> => {
  const { locale } = await params;
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.plus.meta" });
  const metadata = localizedMetadata(locale, "/plus", {
    description: t("description"),
    title: t("title"),
  });
  const filtered = Boolean(query.q || query.category || query.page > 1);
  return filtered
    ? { ...metadata, robots: { follow: true, index: false } }
    : metadata;
};

/**
 * The IDEA Plus: everything about renting on one page. On the unfiltered
 * first page, "Your Plus" (the member's plan and rentals, or a way to
 * sign in) comes first; then the rental catalog (search, categories, the
 * plan each item needs) and how it works, the plans and their tiers.
 */
const Rent = async ({ params, searchParams }: RentProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web" });

  const [categories, allPlans, kits, rows] = await Promise.all([
    getCategories("rental"),
    getPlans("plus"),
    getKitTypes(),
    getProducts({
      category: query.category,
      kind: "rental",
      limit: STORE_PAGE_SIZE + 1,
      offset: (query.page - 1) * STORE_PAGE_SIZE,
      search: query.q,
    }),
  ]);
  // Monthly plans on the page; the yearly ones are in Your Plus.
  const plans = allPlans.filter((plan) => plan.billing_interval === "month");
  const products = rows.slice(0, STORE_PAGE_SIZE);
  const ids = products.map((product) => product.id);
  const [ratings, productTiers] = await Promise.all([
    getRatings(ids),
    getRentalTiers(ids),
  ]);
  const tiers = plansByTier(plans);
  const steps = t.raw("plus.how.steps") as Steps;
  const browsing = Boolean(query.q || query.category || query.page > 1);

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-6 pb-2">
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("rent.title")} <Highlight>{t("rent.highlight")}</Highlight>
        </h1>
        <CategoryChips
          categories={categories}
          hrefFor={(slug) =>
            `/plus${storeQueryString(query, { category: slug, page: 1 })}`
          }
          label={t("store.categories")}
          locale={locale}
        />
        {browsing ? null : (
          <a
            className="inline-flex items-center gap-2 self-start rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted"
            href="#plans"
          >
            {t("rent.plans")}
            <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </a>
        )}
      </div>

      {browsing ? null : (
        <div className="container mx-auto px-4 pt-6">
          <YourPlus />
        </div>
      )}

      <section className="container mx-auto px-4 py-6">
        {query.q ? (
          <p className="mb-4 text-muted-foreground">
            {t("store.results", { query: query.q })}
          </p>
        ) : null}
        {products.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const plan = requiredPlan(plans, productTiers[product.id]);
              return (
                <ProductCard
                  forRent
                  key={product.id}
                  locale={locale}
                  planLabel={
                    plan
                      ? t("plus.catalog.needsPlan", {
                          plan: planName(plan, locale),
                        })
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
              <Link className="text-pink-text underline" href="/plus">
                {t("store.clear")}
              </Link>
            ) : null}
          </EmptyState>
        )}
        <Pagination
          hasNext={rows.length > STORE_PAGE_SIZE}
          hrefFor={(page) => `/plus${storeQueryString(query, { page })}`}
          locale={locale}
          page={query.page}
        />
      </section>

      {browsing ? null : (
        <>
          <Section title={t("plus.how.title")}>
            <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <li
                  className="flex flex-col gap-2 rounded-lg border p-5"
                  key={step.title}
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand font-bold text-brand-foreground">
                    {formatNumber(index + 1, locale)}
                  </span>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground text-sm">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </Section>

          <Section
            description={t("plus.plans.description")}
            id="plans"
            title={t("plus.plans.title")}
          >
            {plans.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((plan, index) => (
                  <PlanCard
                    featured={plans.length >= 3 && index === 1}
                    href="#yours"
                    key={plan.id}
                    locale={locale}
                    plan={plan}
                  />
                ))}
              </div>
            ) : (
              <EmptyState>{t("plus.plans.empty")}</EmptyState>
            )}
          </Section>

          {kits.length > 0 ? (
            <Section
              description={t("plus.kits.description")}
              id="kits"
              title={t("plus.kits.title")}
            >
              <ul className="grid gap-4 md:grid-cols-3">
                {kits.map((kit) => (
                  <li
                    className="flex flex-col gap-3 rounded-lg border p-5"
                    key={kit.id}
                  >
                    <h3 className="font-semibold">
                      {localized(kit, "name", locale)}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {localized(kit, "description", locale)}
                    </p>
                    <p className="font-medium text-sm">
                      {t("plus.kits.price", {
                        extra: formatPrice(kit.extra_day_price, locale),
                        price: formatPrice(kit.price, locale),
                      })}
                    </p>
                    <Button
                      asChild
                      className="mt-auto self-start"
                      variant="outline"
                    >
                      <Link href={`/kits/${kit.id}`}>
                        {t("plus.kits.book")}
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {tiers.length > 1 ? (
            <Section
              description={t("plus.tiers.description")}
              title={t("plus.tiers.title")}
            >
              <ol className="grid gap-4 md:grid-cols-3">
                {tiers.map((plan, index) => (
                  <li
                    className="flex flex-col gap-3 rounded-lg border p-5"
                    key={plan.id}
                  >
                    <Badge className="px-3 py-1 text-sm" variant="plus">
                      {planName(plan, locale)}
                    </Badge>
                    <p className="text-muted-foreground text-sm">
                      {index === 0
                        ? t("plus.tiers.entry")
                        : t("plus.tiers.higher", {
                            plan: planName(plan, locale),
                          })}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          <PinkBand
            action={
              <Button asChild className="gap-2" size="lg" variant="brand">
                <a href="#yours">
                  {t("plus.cta")}{" "}
                  <MoveRight className="size-4 rtl:rotate-180" />
                </a>
              </Button>
            }
            description={t("plus.subtitle")}
            title={
              <>
                {t("plus.title")} <Highlight>{t("plus.highlight")}</Highlight>
              </>
            }
          />
        </>
      )}
    </>
  );
};

export default Rent;

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { Search as SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import { after } from "next/server";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OpportunityCard } from "@/components/club/opportunity-card";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { EmptyState, Section } from "@/components/section";
import {
  getEvents,
  getOpportunities,
  getPosts,
  getProducts,
  getRatings,
  recordSearchMiss,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import { parseStoreQuery } from "@/lib/store-params";

interface SearchProps {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** How many of each kind the page shows; the Store lists the rest. */
const PRODUCTS = 8;
const EDITORIAL = 6;

export const generateMetadata = async ({
  params,
}: SearchProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.search" });
  return {
    ...localizedMetadata(locale, "/search", {
      description: t("description"),
      title: t("title"),
    }),
    // Result pages are never indexed.
    robots: { follow: true, index: false },
  };
};

/**
 * The one search of the website (the magnifier in the top bar): products
 * for sale and to rent, and the Club's events, opportunities and posts,
 * in Arabic or English.
 */
const Search = async ({ params, searchParams }: SearchProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const { q } = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.search" });

  const [products, rentals, posts, events, opportunities] = q
    ? await Promise.all([
        getProducts({ kind: "sale", limit: PRODUCTS + 1, search: q }),
        getProducts({ kind: "rental", limit: PRODUCTS + 1, search: q }),
        getPosts({ limit: EDITORIAL, search: q }),
        getEvents({ limit: EDITORIAL, search: q }),
        getOpportunities({ limit: EDITORIAL, search: q }),
      ])
    : [[], [], [], [], []];
  if (q && products.length + rentals.length === 0) {
    // After the page is sent: Staff see what people looked for in vain.
    after(() => recordSearchMiss(q));
  }
  const ratings = await getRatings(
    [...products, ...rentals].map((product) => product.id)
  );
  const found =
    products.length +
      rentals.length +
      posts.length +
      events.length +
      opportunities.length >
    0;

  return (
    <>
      <PageHero subtitle={t("description")} title={t("title")} />
      <Section className="pb-6">
        <search>
          <form action="" className="flex gap-3" method="get">
            <label className="sr-only" htmlFor="site-search">
              {t("label")}
            </label>
            <div className="relative flex-1">
              <SearchIcon
                aria-hidden="true"
                className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                className="ps-9"
                defaultValue={q}
                id="site-search"
                maxLength={100}
                name="q"
                placeholder={t("placeholder")}
                type="search"
              />
            </div>
            <Button type="submit">{t("submit")}</Button>
          </form>
        </search>
        {q ? (
          <p className="mt-4 text-muted-foreground">
            {t("results", { query: q })}
          </p>
        ) : null}
      </Section>

      {q && !found ? (
        <Section className="pt-0">
          <EmptyState>{t("empty")}</EmptyState>
        </Section>
      ) : null}

      {products.length > 0 ? (
        <Section
          action={
            products.length > PRODUCTS
              ? {
                  href: `/store?${new URLSearchParams({ q: q ?? "" })}`,
                  label: t("allProducts"),
                }
              : undefined
          }
          className="pt-0"
          title={t("products")}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, PRODUCTS).map((product) => (
              <ProductCard
                key={product.id}
                locale={locale}
                product={product}
                rating={ratings[product.id]}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {rentals.length > 0 ? (
        <Section
          action={
            rentals.length > PRODUCTS
              ? {
                  href: `/plus?${new URLSearchParams({ q: q ?? "" })}`,
                  label: t("allRentals"),
                }
              : undefined
          }
          className="pt-0"
          title={t("rentals")}
        >
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {rentals.slice(0, PRODUCTS).map((product) => (
              <ProductCard
                forRent
                key={product.id}
                locale={locale}
                product={product}
                rating={ratings[product.id]}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {events.length > 0 ? (
        <Section className="pt-0" title={t("events")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        </Section>
      ) : null}

      {opportunities.length > 0 ? (
        <Section className="pt-0" title={t("opportunities")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opportunity) => (
              <OpportunityCard
                key={opportunity.id}
                locale={locale}
                opportunity={opportunity}
              />
            ))}
          </div>
        </Section>
      ) : null}

      {posts.length > 0 ? (
        <Section className="pt-0" title={t("posts")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} locale={locale} post={post} />
            ))}
          </div>
        </Section>
      ) : null}
    </>
  );
};

export default Search;

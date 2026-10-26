import { Highlight } from "@repo/design-system/components/brand/highlight";
import { PinkBand } from "@repo/design-system/components/brand/pink-band";
import { Button } from "@repo/design-system/components/ui/button";
import { type Locale, localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { HandCoins, MoveRight } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/section";
import { CategoryChips } from "@/components/shop/category-chips";
import { MemberStrip } from "@/components/shop/member-strip";
import { Rail } from "@/components/shop/rail";
import { StoreSearch } from "@/components/shop/store-search";
import {
  getCategories,
  getEvents,
  getPosts,
  getProducts,
  getRatings,
} from "@/lib/data";
import { pagePath } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface HomeProps {
  params: Promise<{
    locale: Locale;
  }>;
}

export const generateMetadata = async ({
  params,
}: HomeProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.home.meta" });

  return localizedMetadata(locale, "/", {
    description: t("description"),
    title: t("title"),
  });
};

/**
 * Home is the storefront: search, categories, what's featured and new,
 * a way into rentals, then events and The IDEA Club. The company's own
 * pages are under /about.
 */
const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [categories, featured, newest, posts, events] = await Promise.all([
    getCategories("sale"),
    getProducts({ featured: true, limit: 8 }),
    getProducts({ limit: 8, sort: "newest" }),
    getPosts({ limit: 4 }),
    getEvents({ limit: 4 }),
  ]);
  const ratings = await getRatings(
    [...featured, ...newest].map((product) => product.id)
  );
  const card = (product: (typeof featured)[number]) => (
    <ProductCard
      key={product.id}
      locale={locale}
      product={product}
      rating={ratings[product.id]}
    />
  );

  return (
    <>
      <div className="container mx-auto flex flex-col gap-4 px-4 pt-6 pb-2">
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("home.title")}
        </h1>
        <StoreSearch
          action={localePath(locale, "/store")}
          id="home-search"
          label={t("store.searchLabel")}
          placeholder={t("store.searchPlaceholder")}
        />
        <CategoryChips
          categories={categories}
          hrefFor={(slug) => `/store?category=${encodeURIComponent(slug)}`}
          label={t("store.categories")}
          locale={locale}
        />
        <MemberStrip />
      </div>

      {featured.length > 0 ? (
        <Rail
          action={{ href: "/store", label: t("ui.viewAll") }}
          title={t("home.featured.title")}
        >
          {featured.map(card)}
        </Rail>
      ) : null}

      {newest.length > 0 ? (
        <Rail
          action={{ href: "/store", label: t("ui.viewAll") }}
          title={t("home.newest.title")}
        >
          {newest.map(card)}
        </Rail>
      ) : (
        <div className="container mx-auto px-4 py-6">
          <EmptyState>{t("home.featured.empty")}</EmptyState>
        </div>
      )}

      <section className="container mx-auto px-4 py-6">
        <Link
          className="group flex flex-col gap-3 rounded-lg border bg-surface-raised p-6 shadow-1 transition-shadow hover:shadow-2 md:flex-row md:items-center md:justify-between md:p-8"
          href="/plus"
        >
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-xl tracking-tight md:text-2xl">
              {t("home.rent.title")}{" "}
              <Highlight>{t("home.rent.highlight")}</Highlight>
            </h2>
            <p className="text-muted-foreground">
              {t("home.rent.description")}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 font-medium text-pink-text">
            {t("home.rent.cta")}
            <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </span>
        </Link>
      </section>

      {events.length > 0 ? (
        <Rail
          action={{ href: "/club?show=events", label: t("ui.viewAll") }}
          title={t("home.events.title")}
        >
          {events.map((event) => (
            <EventCard event={event} key={event.id} locale={locale} />
          ))}
        </Rail>
      ) : null}

      {posts.length > 0 ? (
        <Rail
          action={{ href: "/club", label: t("ui.viewAll") }}
          title={t("home.news.title")}
        >
          {posts.map((post) => (
            <PostCard key={post.id} locale={locale} post={post} />
          ))}
        </Rail>
      ) : null}

      <div className="pt-8">
        <PinkBand
          action={
            <Button asChild className="gap-2" size="lg" variant="brand">
              <a href={pagePath(locale, "/pass/orders#sell")}>
                <HandCoins aria-hidden="true" />
                {t("store.sell.cta")}
              </a>
            </Button>
          }
          description={t("store.sell.description")}
          title={<Highlight>{t("store.sell.title")}</Highlight>}
        />
      </div>
    </>
  );
};

export default Home;

import { Highlight } from "@repo/design-system/components/brand/highlight";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale, Messages } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import {
  Headphones,
  MoveRight,
  ShieldCheck,
  Truck,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppCta } from "@/components/app-cta";
import { EventCard, PostCard } from "@/components/editorial-cards";
import { PageHero } from "@/components/page-hero";
import { ProductCard } from "@/components/product-card";
import { ProductLines } from "@/components/product-lines";
import { EmptyState, Section } from "@/components/section";
import { env } from "@/env";
import { getEvents, getPosts, getProducts, getRatings } from "@/lib/data";
import { appLink } from "@/lib/links";
import { localizedMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface HomeProps {
  params: Promise<{
    locale: Locale;
  }>;
}

type Values = Messages["web"]["home"]["values"]["items"];
const valueIcons = [Truck, Wallet, ShieldCheck, Headphones];

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

const Home = async ({ params }: HomeProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web" });
  const [featured, posts, events] = await Promise.all([
    getProducts({ featured: true, limit: 8 }),
    getPosts(3),
    getEvents({ limit: 3 }),
  ]);
  const ratings = await getRatings(featured.map((product) => product.id));
  const values = t.raw("home.values.items") as Values;

  return (
    <>
      <PageHero
        badge={t("home.hero.badge")}
        highlight={t("home.hero.highlight")}
        subtitle={t("home.hero.subtitle")}
        title={t("home.hero.title")}
      >
        <Button asChild className="gap-2" size="lg">
          <a href={appLink(env.NEXT_PUBLIC_APP_URL, locale)}>
            {t("home.hero.primary")}
            <MoveRight className="size-4 rtl:rotate-180" />
          </a>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/about">{t("home.hero.secondary")}</Link>
        </Button>
      </PageHero>

      <Section
        description={t("home.lines.description")}
        title={t("home.lines.title")}
      >
        <ProductLines locale={locale} />
      </Section>

      <Section
        action={{ href: "/store", label: t("ui.viewAll") }}
        description={t("home.featured.description")}
        title={t("home.featured.title")}
      >
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {featured.map((product) => (
              <ProductCard
                key={product.id}
                locale={locale}
                product={product}
                rating={ratings[product.id]}
              />
            ))}
          </div>
        ) : (
          <EmptyState>{t("home.featured.empty")}</EmptyState>
        )}
      </Section>

      <section className="container mx-auto px-4 py-14">
        <div className="grid gap-10 rounded-lg border bg-muted/40 p-8 md:grid-cols-2 md:p-12">
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-3xl tracking-tight md:text-4xl">
              {t("home.values.title")}{" "}
              <Highlight>{t("home.values.highlight")}</Highlight>
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("home.values.description")}
            </p>
          </div>
          <ul className="grid gap-6 sm:grid-cols-2">
            {values.map((value, index) => {
              const Icon = valueIcons[index] ?? ShieldCheck;
              return (
                <li className="flex gap-3" key={value.title}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-brand text-brand-foreground">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{value.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {value.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Section
        action={{ href: "/news", label: t("ui.viewAll") }}
        title={t("home.news.title")}
      >
        {posts.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} locale={locale} post={post} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("home.news.empty")}</EmptyState>
        )}
      </Section>

      <Section
        action={{ href: "/events", label: t("ui.viewAll") }}
        title={t("home.events.title")}
      >
        {events.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-3">
            {events.map((event) => (
              <EventCard event={event} key={event.id} locale={locale} />
            ))}
          </div>
        ) : (
          <EmptyState>{t("home.events.empty")}</EmptyState>
        )}
      </Section>

      <AppCta locale={locale} />
    </>
  );
};

export default Home;
